/* global macro chilipeppr */
/* 
// works only with GRBL as main controller! (State event)

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
   serialPort: "COM10",
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
      chilipeppr.subscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete", this, this.onChiliPepprPauseOnComplete);
      chilipeppr.subscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onChiliPepprStateChanged);
   },
   unsetupSubscribe: function() {
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnExecute", this.onChiliPepprPauseOnExecute);
      chilipeppr.unsubscribe("/com-chilipeppr-widget-gcode/onChiliPepprPauseOnComplete", this.onChiliPepprPauseOnComplete);
      chilipeppr.unsubscribe("/com-chilipeppr-interface-cnccontroller/status", this, this.onChiliPepprStateChanged);
   },
   onChiliPepprStateChanged: function(state){
      this.State = state; // Save state, works only with GRBL!
   },
   onChiliPepprPauseOnExecute: function(data) {
      this.onPauseAction(data);
   },
   onChiliPepprPauseOnComplete: function(data) {
      this.parseComment(data);
      setTimeout(this.onPauseAction.bind(this), 250);
   },
   unpauseGcode: function() {
      macro.status("Just unpaused gcode.");
      chilipeppr.publish("/com-chilipeppr-widget-gcode/pause", "");
   },
   ctr: 0,
   parseComment: function(data){
      var gcode = data.gcode;
      gcode = gcode.replace(')','');
      // save only relevant gcode string for second device
      this.release                  = 0.06;
      this.GCmd                     = gcode.split(' ').slice(2,3);
      this.Command                  = null;

      if(this.GCmd.match(/drop/)){
         // (chilipeppr_pause drop3 G1 X0.5) => G1 X0.5
         this.Command                  = 'dispense';
         this.DispenserMove            = parseFloat(gcode.split(' ').slice(-1).toString().replace(/[a-z]/ig, ''));
         this.DispenserGcode           = gcode.split(' ').slice(-3).join(' ') + "\n";
         this.DispenserReleaseGcode    = "G0 X-" + this.release + "\n";
      }

      if(this.GCmd.match(/vacuum/)){
         // (chilipeppr_pause vacuum false)
         this.Command                  = 'vacuum';
         this.VacuumState              = (gcode.split(' ')[-1] == 'true' ? true : false);
      }
      
      macro.status("Send to : " + this.serialPort + ' cmd: "' + this.GCmd + '"');
   },
   onPauseAction: function(data) {
      // wait on main controller's idle state (think asynchron!)
      if(this.State != "Idle"){ // wait for idle state
         setTimeout(this.onPauseAction.bind(this), 250);
         return;
      }
      var payload,
      cmd = "sendjson ";

      if(this.Command == 'dispense')
         payload = this.dispense();

      if(this.Command == 'vacuum')
         payload = this.vacuum();

      cmd += JSON.stringify(payload) + "\n";
      chilipeppr.publish("/com-chilipeppr-widget-serialport/ws/send", cmd);
      setTimeout(this.unpauseGcode, 1000); // give action some time
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
   vacuum: function(){
      return {
         P: this.serialPort,
         Data: [
            {
               D: (this.VacuumState ? 'M3' : 'M5') + "\n",
               Id: "vacuum " + this.VacuumState
            }

         ]
      };
   }
};
myWatchChiliPepprPause.init();