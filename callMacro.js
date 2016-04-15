// get external js macro and run it
$.getScript( "//rawgit.com/xpix/widget-eagle-pickandplace/master/macro_tinyg.js", function( data, textStatus, jqxhr ) {
  var e = window["myXdisplaceMacro"];
  e.serialPort = "/dev/ttyUSB0"; // GRBL Second Controller
  e.serialPortXTC= "/dev/ttyUSB2"; // XTC Controlelr
  e.atcParameters = {
      level:   800,     // the current level in mA where the spindle will break
      revlevel:-3000,   // the reverse level in mA where the spindle will break
      forward: 30,      // value for minimum rpm
      safetyHeight: 35, // safety height
      feedRate: 300,    // Feedrate to move over the catch cable
      nutZ: -7,         // safety deep position of collet in nut
  };
  e.atcMillHolder = [
      // Center Position holder, catch height, tighten value, how long tighten in milliseconds
      // ---------|-------------|-------------|--------------------------------
      {posX : -235, posY : 26.5,   posZ: 5,   tourque: 300, time: 500}, // first endmill holder
//    {posX : -150, posY : 100,    posZ: 5,   tourque: 200, time: 500}, // second endmill holder
  ];
  e.init();
  console.log( "Load was performed." );
});