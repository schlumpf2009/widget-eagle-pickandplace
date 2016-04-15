/* global macro chilipeppr */
/* 

This macro shows how to watch for the chilipeppr
pause sync event that is triggered if you include
a comment in your gcode file like 
(chilipeppr_pause) or ; chilipeppr_pause

 This will parse the comment to get gcode from commandline i.e.:
   (chilipeppr_pause drop23 G1 X0.5)
 or
   (chilipeppr_pause vacuum true)
  
 And then it sends commands to a 2nd CNC cnccontroller
 to actually dispense solder paste or switch vacuum solenoid on or off

// at this moment i found this best parameters for dispense drop:
Canulla: 0.6mm
Z-Height: 0.3 (C / 2)
X-Move: 0.6mm

// add xtc (Xpix Automatic Tool Change) to macro

To test this with tinyg2 or tinyg follow this steps:
   * use SPJS 1.89
   * use url http://chilipeppr.com/tinyg?v9=true
   * set linenumbers on
   * in tinyg widget set "No init CMD's Mode"
   * choose "tinygg2" in SPJS Widget

*/
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

var myWatchChiliPepprPause = {
   serialPort:       "/dev/ttyUSB0", // GRBL Second Controller
   serialPortMch:    "/dev/ttyUSB1", // Main CNC Controller
   serialPortXTC:    "/dev/ttyUSB2", // XTC Controlelr
   //serialPort:       "COM5",
   //serialPortXTC:    "COM3",
   vacuumCommands: {
      on:  ['M5', 'M8'],   // 1.valve: open | 2.valve: close
      off: ['M3', 'M9'],   // 1.valve: close| 2.valve: open
      reset: ['M5', 'M9']  // switch off all values
   },
   atcParameters: {
      level:   800,     // the current level in mA where the spindle will break
      revlevel:-3000,   // the reverse level in mA where the spindle will break
      forward: 30,      // value for minimum rpm
      safetyHeight: 35, // safety height
      feedRate: 300,    // Feedrate to move over the catch cable
      nutZ: -7,         // safety deep position of collet in nut
   },
   atcMillHolder: [
      // Center Position holder, catch height, tighten value, how long tighten in milliseconds
      // ---------|-------------|-------------|--------------------------------
      {posX : -235, posY : 26.5,   posZ: 5,   tourque: 300, time: 500}, // first endmill holder
//    {posX : -150, posY : 100,    posZ: 5,   tourque: 200, time: 500}, // second endmill holder
   ],
   feedRate: 100,
   toolnumber: 0,
   pauseline: 0,
	exeLine: 0,
	toolinuse: 0,
	init: function() {
      // Uninit previous runs to unsubscribe correctly, i.e.
      // so we don't subscribe 100's of times each time we modify
      // and run this macro
      if (window["myWatchChiliPepprPause"]) {
         macro.status("This macro was run before. Cleaning up...");
         window["myWatchChiliPepprPause"].uninit();
         window["myWatchChiliPepprPause"] = undefined;
      }
      macro.status("Subscribing to chilipeppr_pause pubsub event");
      
      // store macro in window object so we have it next time thru
      window["myWatchChiliPepprPause"] = this;

      // Check for Automatic Toolchange Command
      chilipeppr.subscribe("/com-chilipeppr-widget-serialport/jsonSend", this, this.onJsonSend);
		chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/onExecute", this, this.onATC);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);

      // Check for all supported commands
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute); // TINYG
      
      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XDisPlace Macro", "Send commands to second xdisplace cnccontroller for Dispense and Pick&Place");
   },
   uninit: function() {
      macro.status("Uninitting chilipeppr_pause macro.");
		chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/onExecute", this, this.onATC);
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this.onChiliPepprPauseOnExecute); // TINYG
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete", this.onChiliPepprPauseOnExecute); // TINYG
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
   },
   onStateChanged: function(state){
      console.log('ATC State:', state, this);
      this.State = state;
      if(this.State === 'End')
         this.exeLine = 0;
   },
   onJsonSend: function(data){
      // test to M6 and try to find the toolnumber
      console.log('ATC data', data);

      if($.type(data) === 'array'){
         var that = this;
         data.forEach(function(gcode){
            var toolmark = gcode.D.split(' ')[3];
            that.exeLine++;
            
            if(/^T\d+/.test(toolmark)){
               var tn = parseInt(toolmark.match(/(\d+)/).pop());
               if( tn > 0){
                  that.toolnumber = tn;
                  that.pauseline = that.exeLine;
               }
               console.log('ATC Toolnumber/Pauseline', that.toolnumber, that.pauseline);
            }
         });
      }
   },
   onATC: function(data){
      console.log('ATC Execute Line:', data, data.line);

      // now the machine is in pause mode
      // cuz M6 linenumber are the same as actual linenumber
      // and we can do whatever we like :)
      if(data.line == this.pauseline){
         console.log('ATC Process:', this);

         // check if a different tool in use
         if(this.toolinuse > 0 && this.toolinuse != this.toolnumber){
            this.atc_move_to_holder(this.toolinuse);     // move to holder ...
            setTimeout(this.atc_loose.bind(this), 250);  // put tool in holder
         }
         
         // get new tool from holder
         this.atc_move_to_holder(this.toolnumber);    // move to holder ...
         setTimeout(this.atc_tight.bind(this), 250);  // get tool from holder
      }
   },
   atc_move_to_holder: function( toolnumber ){
      // get parameters for millholder
      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (toolnumber-1) ]; 

      if($.type(holder) !== 'object')
         return;

      // start spindle very slow and set current level
      var cmd = "send " 
                  + this.serialPortXTC + " " 
                  + "fwd " + (atcparams.forward+100) + "\n" 
                  + "fwd " + atcparams.forward + "\n" 
                  + "lev " + atcparams.level + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      // now move spindle to the holder position
      cmd = "G0 X" + holder.posX + " Y" + holder.posY + " Z" + atcparams.safetyHeight + "\n"; 
      cmd += "G0 Z" + holder.posZ + "\n";
      cmd += "G0 Z" + atcparams.nutZ + " F" + atcparams.feedRate + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/send", cmd);
   },
   atc_loose: function(){
      // wait on main cnccontroller's stop state (think asynchron!)
      if(this.State != "Stop"){ // wait for stop state
         setTimeout(this.atc_loose.bind(this), 250);
         return;
      }

      // ok state == stop, now we can tighten nut and move the machine 

      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (this.toolinuse-1)];
      
      // loose process
      var cmd = "send " + this.serialPortXTC + " " 
                  + "bwd " + (holder.tourque+50) + " " + holder.time + "\n" // rotate backward and 
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      setTimeout(function() { // and loose the collet some time later
         var cmdwait = "send " + this.serialPortXTC + " " + "lev " + atcparams.revlevel + "\n"; 
         chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
      }, 50);

      // set tool in use
      this.toolinuse = 0;

      // wait for tighten process and move to a secure position and unpause this toolchange
      var that = this;
      setTimeout(function () {
         cmd = "G0 Z" + atcparams.safetyHeight + "\n"; 
         chilipeppr.publish("/com-chilipeppr-widget-serialport/send", cmd);

         that.unpauseGcode();
       }, (holder.time*2));
   },
   atc_tight: function(){
      // wait on main cnccontroller's stop state (think asynchron!)
      if(this.State != "Stop"){ // wait for stop state
         setTimeout(this.atc_tight.bind(this), 250);
         return;
      }

      // ok state == stop, now we can tighten nut and move the machine 

      var atcparams = this.atcParameters;
      var holder = this.atcMillHolder[ (this.toolnumber -1)];
      
      // tighten process
      var cmd = "send " 
                  + this.serialPortXTC + " " 
                  + "fwd " + holder.tourque + " " + holder.time + "\n"
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      // set tool in use
      this.toolinuse = this.toolnumber;

      // wait for tighten process and move to a secure position and unpause this toolchange
      var that = this;
      setTimeout(function () {
         cmd = "G0 Z" + atcparams.safetyHeight + "\n"; 
         chilipeppr.publish("/com-chilipeppr-widget-serialport/send", cmd);

         that.unpauseGcode();
       }, (holder.time*2));
   },
   onChiliPepprPauseOnExecute: function(data) {
      this.parseComment(data);
      this.onPauseAction(data);
   },
   unpauseGcode: function() {
      macro.status("Just unpaused gcode.");
      chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", "");
   },
   ctr: 100,
   parseComment: function(data){
      this.GCODE = data.gcode;
      var gcode = this.GCODE.replace(')','');
      // save only relevant gcode string for second device
      this.release                  = 0.06;
      this.GCmd                     = gcode.split(' ').slice(2,3)[0];
      this.Command                  = null;

      if(this.GCmd.match(/drop/)){
         // (chilipeppr_pause drop3 G1 X0.5) => G1 X0.5
         this.Command                  = 'dispense';
         this.DispenserMove            = parseFloat(gcode.split(' ').slice(-1).toString().replace(/[a-z]/ig, ''));
         this.DispenserGcode           = gcode.split(' ').slice(-3).join(' ') + "\n";
         this.DispenserReleaseGcode    = "G0 X-" + this.release + "\n";
         this.Wait                     = this.distance2time(this.DispenserMove+this.release);
      } else

      if(this.GCmd.match(/vacuum/)){
         // (chilipeppr_pause vacuum false)
         this.Command             = 'vacuum';
         this.VacuumState         = (gcode.split(' ').last() == 'true' ? true : false);
         this.Wait                = 250;
      } else

      if(this.GCmd.match(/vacuum\s+reset/)){
         // (chilipeppr_pause vacuum reset)
         this.Command             = 'vacuum_reset';
         this.Wait                = 250;
      } else 
      if(this.GCmd.match(/rotate/)){
         // (chilipeppr_pause rotate G1 Z0.9)
         this.Command             = 'rotate';
         this.Rotate              = parseFloat(gcode.split(' ').last().replace(/\D+/,''));
         this.RotateGcode         = gcode.split(' ').slice(-3).join(' ') + "\n";
         this.Wait                = this.distance2time(this.Rotate);
      } else 
      if(this.GCmd.match(/xtc/)){
         // (chilipeppr_pause xtc lev 200)
         this.Command            = 'xtc';
         this.xtcCmd             = gcode.split(' ').slice(-2)[0];
         this.xtcValue           = parseFloat(gcode.split(' ').last());
         this.Wait               = 250;
      }
console.log('Macro this: ', this);
   },
   onPauseAction: function(data) {
      // wait on main cnccontroller's idle state (think asynchron!)
      var payload,
      cmd = "sendjson ";

      if(this.Command == 'dispense')
         payload = this.dispense();

      else if(this.Command == 'vacuum')
         payload = this.vacuum();

      else if(this.Command == 'vacuum_reset')
         payload = this.vacuum('reset');

      else if(this.Command == 'rotate')
         payload = this.rotate();

      else if(this.Command == 'xtc')
         payload = this.xtc();

      cmd += JSON.stringify(payload) + "\n";
      macro.status("Send to : " + this.serialPort + ' cmd: "' + payload.Data.last().D.replace(/\n/,'') + '" Timeout: ' + this.Wait + ' ms');
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      setTimeout(this.unpauseGcode, this.Wait); // give action some time
   },
   dispense: function(){
      this.ctr++;
      macro.status("Dispensing drop " + this.ctr);
      return {
         P: this.serialPort,
         Data: [
            {
               D: "G91\n",
               Id: "dispenseRelCoords" + this.ctr
            },
            {
               D: this.DispenserGcode,
               Id: "dispense" + this.ctr
            },
            {
               D: this.DispenserReleaseGcode,
               Id: "dispenseRelease" + this.ctr
            }

         ]
      };
   },
   vacuum: function(reset){
      if(reset !== undefined){
         return {
            P: this.serialPort,
            Data: [
               {
                  D: this.vacuumCommands.reset.join(' ') + "\n",
                  Id: "vacuum " + this.VacuumState
               }
   
            ]
         };
      } else {
         return {
            P: this.serialPort,
            Data: [
               {
                  D: (this.VacuumState ? this.vacuumCommands.on.join(' ') : this.vacuumCommands.off.join(' ')) + "\n",
                  Id: "vacuum " + this.VacuumState
               }
   
            ]
         };
      }
   },
   rotate: function(){
      return {
         P: this.serialPort,
         Data: [
            {
               D: this.RotateGcode,
               Id: "rotate " + ++this.ctr
            }

         ]
      };
   },

   xtc: function(){
      return {
         P: this.serialPortXTC,
         Data: [
            {
               D: this.xtcCmd + ' ' + this.xtcValue + "\n",
               Id: "xtc " + ++this.ctr
            }

         ]
      };
   },

   distance2time:function(distance){
      return (distance / this.feedRate) * (60*1000); // distane in milliseconds
   },
};
myWatchChiliPepprPause.init();