/* global macro chilipeppr $ */
/* 

============ MACRO Pick and Place ==============================================

This macro is used for Pick an Place. A second (GRBL) Controller control stepper 
pnp head rotation and vacuum valves on and off via gcode commands. 

This will parse the comment to get gcode from commandline i.e.:
   (chilipeppr_pause vacuum true)
  
And then it sends commands to a 2nd CNC cnccontroller
to actually dispense solder paste or switch vacuum solenoid on or off

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

var myPNPMacro = {
   serialPort:       "/dev/ttyUSB0", // GRBL Second Controller
   vacuumCommands: {
      on:   ['M5', 'M8'],   // 1.valve: open | 2.valve: close
      off:  ['M3', 'M9'],   // 1.valve: close| 2.valve: open
      reset:['M5', 'M9']    // switch off all values
   },
   feedRate: 100,
	init: function() {
      // Uninit previous runs to unsubscribe correctly, i.e.
      // so we don't subscribe 100's of times each time we modify
      // and run this macro
      if (window["myPNPMacro"]) {
         macro.status("This macro was run before. Cleaning up...");
         window["myPNPMacro"].uninit();
      }
      macro.status("Subscribing to chilipeppr_pause pubsub event");
      
      // store macro in window object so we have it next time thru
      window["myPNPMacro"] = this;

      // Check for Automatic Toolchange Command
      chilipeppr.subscribe("/com-chilipeppr-widget-serialport/onComplete", this, this.onComplete);
      chilipeppr.subscribe("/com-chilipeppr-widget-serialport/jsonSend", this, this.onJsonSend);
		chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/onExecute", this, this.onATC);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);

      // Check for all supported commands
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this, this.onChiliPepprPauseOnExecute); // TINYG
      
      chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "XDisPlace Macro", "Send commands to second xdisplace cnccontroller for Dispense and Pick&Place");
      
      this.getGcode();
   },
   uninit: function() {
      macro.status("Uninitting chilipeppr_pause macro.");
      chilipeppr.unsubscribe("/com-chilipeppr-widget-serialport/onComplete", this, this.onComplete);		
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/onExecute", this, this.onATC);
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this.onChiliPepprPauseOnExecute); // TINYG
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete", this.onChiliPepprPauseOnExecute); // TINYG
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onStateChanged);
      this.exeLine = 0;
   },
   onStateChanged: function(state){
      console.log('ATC State:', state, this);
      this.State = state;
      if(this.State === 'End')
         this.exeLine = 0;
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
      }
   },
   onPauseAction: function(data) {
      // wait on main cnccontroller's idle state (think asynchron!)
      var payload,
      cmd = "sendjson ";

      if(this.Command == 'vacuum')
         payload = this.vacuum();

      else if(this.Command == 'vacuum_reset')
         payload = this.vacuum('reset');

      else if(this.Command == 'rotate')
         payload = this.rotate();

      cmd += JSON.stringify(payload) + "\n";
      macro.status("Send to : " + this.serialPort + ' cmd: "' + payload.Data.last().D.replace(/\n/,'') + '" Timeout: ' + this.Wait + ' ms');
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);

      setTimeout(this.unpauseGcode, this.Wait); // give action some time
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

   distance2time:function(distance){
      return (distance / this.feedRate) * (60*1000); // distane in milliseconds
   },
};
// call init from cp macro loader
// myPNPMacro.init();