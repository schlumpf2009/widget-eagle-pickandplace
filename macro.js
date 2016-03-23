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
  
 And then it sends commands to a 2nd CNC controller
 to actually dispense solder paste or switch vacuum solenoid on or off

// at this moment i found this best parameters for dispense drop:
Canulla: 0.6mm
Z-Height: 0.3 (C / 2)
X-Move: 0.6mm

*/
var myWatchChiliPepprPause = {
   serialPort:       "/dev/ttyUSB0",
   serialPortXTC:    "/dev/ttyUSB1",
   vacuumCommands: {
      on:  ['M5', 'M8'],   // 1.valve: open | 2.valve: close
      off: ['M3', 'M9'],   // 1.valve: close| 2.valve: open
      reset: ['M5', 'M9']  // switch off all values
   },
   feedRate: 100,
   init: function() {
      // Uninit previous runs to unsubscribe correctly, i.e.
      // so we don't subscribe 100's of times each time we modify
      // and run this macro
      if (window["myWatchChiliPepprPause"]) {
         macro.status("This macro was run before. Cleaning up...");
         window["myWatchChiliPepprPause"].uninit();
      }
      macro.status("Subscribing to chilipeppr_pause pubsub event");
      
      // store macro in window object so we have it next time thru
      window["myWatchChiliPepprPause"] = this;

      if (!Array.prototype.last){
          Array.prototype.last = function(){
              return this[this.length - 1];
          };
      };

      this.setupSubscribe();
      
      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XDisPlace Macro", "Send commands to second xdisplace controller for Dispense and Pick&Place");
   },
   uninit: function() {
      macro.status("Uninitting chilipeppr_pause macro.");
      this.unsetupSubscribe();
   },
   setupSubscribe: function() {
      // Subscribe to both events because you will not
      // get onComplete if the controller is sophisticated
      // enough to send onExecute, i.e. TinyG will only
      // get onExecute events while Grbl will only get
      // onComplete events
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute);
      // chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete", this, this.onChiliPepprPauseOnComplete);
   },
   unsetupSubscribe: function() {
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this.onChiliPepprPauseOnExecute);
      //chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete", this.onChiliPepprPauseOnComplete);
   },
   onChiliPepprPauseOnExecute: function(data) {
      this.parseComment(data);
      this.onPauseAction(data);
   },
   onChiliPepprPauseOnComplete: function(data) {
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
      }

      if(this.GCmd.match(/vacuum/)){
         // (chilipeppr_pause vacuum false)
         this.Command             = 'vacuum';
         this.VacuumState         = (gcode.split(' ').last() == 'true' ? true : false);
         this.Wait                = 250;
      }

      if(this.GCmd.match(/vacuum\s+reset/)){
         // (chilipeppr_pause vacuum reset)
         this.Command             = 'vacuum_reset';
         this.Wait                = 250;
      }

      if(this.GCmd.match(/rotate/)){
         // (chilipeppr_pause rotate G1 Z0.9)
         this.Command             = 'rotate';
         this.Rotate              = parseFloat(gcode.split(' ').last().replace(/\D+/,''));
         this.RotateGcode         = gcode.split(' ').slice(-3).join(' ') + "\n";
         this.Wait                = this.distance2time(this.Rotate);
      }

      if(this.GCmd.match(/xtc/)){
         // (chilipeppr_pause XTC lev 200)
         this.Command            = 'xtc';
         this.xtcCmd             = gcode.split(' ').slice(-2);
         this.xtcValue           = parseFloat(gcode.split(' ').last());
      }
      
console.log('MACRO: ', this);
   },
   onPauseAction: function(data) {
      // wait on main controller's idle state (think asynchron!)
      var payload,
      cmd = "sendjson ";

      if(this.Command == 'dispense')
         payload = this.dispense();

      if(this.Command == 'vacuum')
         payload = this.vacuum();

      if(this.Command == 'vacuum_reset')
         payload = this.vacuum('reset');

      if(this.Command == 'rotate')
         payload = this.rotate();

      if(this.Command == 'xtc')
         payload = this.xtc();

      cmd += JSON.stringify(payload) + "\n";
      macro.status("Send to : " + this.serialPort + ' cmd: "' + payload.Data.last().D.replace(/\n/,'') + '" Timeout: ' + this.Wait + ' ms');
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      setTimeout(this.unpauseGcode, this.Wait); // give action some time
      //setTimeout(this.unpauseGcode, 1000); // give action some time
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
               D: this.xtcCmd + ' ' + this.xtcValue,
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