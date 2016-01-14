/* global requirejs cprequire cpdefine chilipeppr THREE */
// Defining the globals above helps Cloud9 not show warnings for those variables

// ChiliPeppr Widget/Element Javascript

cprequire_test(["inline:com-chilipeppr-widget-eagle-pickandplace"], function(pickandplace) {

    // Test this element. This code is auto-removed by the chilipeppr.load()
    // when using this widget in production. So use the cpquire_test to do things
    // you only want to have happen during testing, like loading other widgets or
    // doing unit tests. Don't remove end_test at the end or auto-remove will fail.

    console.log("test running of " + pickandplace.id);

    // adjust my title
    $('title').html(pickandplace.name);
    
    $('body').prepend(
        '<div id="com-chilipeppr-flash"></div>' +
        '<div id="test-drag-drop"></div>' +
        '<div id="3dviewer"></div>' +
        '<div id="test-eagle" style="position: relative; width: 320px; background:none;"></div>' +
        ''
    );

    chilipeppr.load("#3dviewer", "http://fiddle.jshell.net/chilipeppr/y3HRF/195/show/light/", function() {
        cprequire(['inline:com-chilipeppr-widget-3dviewer'], function(threedviewer) {

            // When we init the 3d viewer, tell it to not do its own drag/drop
            threedviewer.init({
                doMyOwnDragDrop: false
            });

            // do some tweaking of the layout
            // $('#com-chilipeppr-widget-eagle').css('position', 'absolute');
            // $('#com-chilipeppr-widget-eagle').css('left', '10px');
            // $('#com-chilipeppr-widget-eagle').css('top', '10px');
            // $('#com-chilipeppr-widget-eagle').css('width', '300px');

            
            // now load the eagle widget, so that we can init our solder mask widget
            chilipeppr.load(
                "#test-eagle",
//              "https://raw.githubusercontent.com/chilipeppr/widget-eagle/master/auto-generated-widget.html",
                "https://raw.githubusercontent.com/xpix/widget-eagle/master/auto-generated-widget.html",
                function() {
                    // Callback after widget loaded into #myDivWidgetInsertedInto
                    
                    cprequire(
                        ["inline:com-chilipeppr-widget-eagle"],
                        function(eagleWidget) {
                            // Callback that is passed reference to your newly loaded widget
                            console.log("Eagle widget just got loaded.", eagleWidget);
                            
                            $('#com-chilipeppr-widget-eagle').css('background', 'none');

                            // only init eagle widget once 3d is loaded
                            // set doMyOwnDragDrop
                            eagleWidget.init(true);
                            
                            // now init our own widget
                            pickandplace.init(eagleWidget);
                        }
                    );
                    
                }
            );
            

        });
    });

    chilipeppr.load("#test-drag-drop", "http://fiddle.jshell.net/chilipeppr/Z9F6G/show/light/",

        function() {
            cprequire(
                ["inline:com-chilipeppr-elem-dragdrop"],

                function(dd) {
                    dd.init();
                    dd.bind("body", null);
                });
        });

    chilipeppr.load("#com-chilipeppr-flash",
        "http://fiddle.jshell.net/chilipeppr/90698kax/show/light/",

        function() {
            console.log("mycallback got called after loading flash msg module");
            cprequire(["inline:com-chilipeppr-elem-flashmsg"], function(fm) {
                //console.log("inside require of " + fm.id);
                fm.init();
            });
        });

} /*end_test*/ );

// This is the main definition of your widget. Give it a unique name.
cpdefine("inline:com-chilipeppr-widget-eagle-pickandplace", ["chilipeppr_ready", /* other dependencies here */ ], function() {
    return {
        /**
         * The ID of the widget. You must define this and make it unique.
         */
        id: "com-chilipeppr-widget-eagle-pickandplace", // Make the id the same as the cpdefine id
        name: "Widget Add-On / Pick and Place", // The descriptive name of your widget.
        desc: "This add-on widget is a tab for the Eagle BRD widget that helps you generate gcode for pick and place smd components to a pcb.", // A description of what your widget does
        url: "(auto fill by runme.js)", // The final URL of the working widget as a single HTML file with CSS and Javascript inlined. You can let runme.js auto fill this if you are using Cloud9.
        fiddleurl: "(auto fill by runme.js)", // The edit URL. This can be auto-filled by runme.js in Cloud9 if you'd like, or just define it on your own to help people know where they can edit/fork your widget
        githuburl: "(auto fill by runme.js)", // The backing github repo
        testurl: "(auto fill by runme.js)", // The standalone working widget so can view it working by itself
        /**
         * PICK AND PLACE VARIABLES.
         */
        /**
         * BETA: Save smd 3d models from https://eagleup.wordpress.com/ in 
         * sketchup 3d warehouse and use there 3d model viewer at popup for trays
         * URL Database to my 3dwarehouse gallery, later we save this as json file and load this dynamic
         * some examples
         */
        packages3D:{
            'C0603': 'https://3dwarehouse.sketchup.com/embed.html?mid=ub1b01b5b-2631-43f4-88f0-d2ae7a9ef7ae',
            'C0805': 'https://3dwarehouse.sketchup.com/embed.html?mid=ub6fa6b56-cded-4b48-b61b-19b84cfdcf84',
            'R0603': 'https://3dwarehouse.sketchup.com/embed.html?mid=u1ac1438a-16ce-491b-a128-d039d96cbb5f',
            'R0805': 'https://3dwarehouse.sketchup.com/embed.html?mid=ua6fc0469-d44e-43eb-87db-0f9f119f8a62'
        },
        pnpholders: {
            'PNP Holder V0.1': 'pnp_holder_v0.1'
        },
        rotateAxis: 'Y',      // Rotation axis on the second controller
        nozzleDiameter: 1,    // noozle diameter in mm
        safetyHeight: 5,        // safety height for rapid moves
        // this define the trays, this will later load via ajax 
        // for every tray holder but for the first time we define here the structure
        holderCoordinates: {
            size: {dx: 260, dy:130, dz: 10},
            zero: {x: 6, y: 55},   // calculated from center of platform
            pcbThick: 0.6,          // pcb thick minus deep of pcb pocket in mm i.e.: (1.6mm - 1mm)
            sortAxis: 'x',          // Axis for calculate ways
            pcbholder: {dx: 120, dy: 80, deep: -1}, // dimensions of pcb holder
            structure: {            // http://www.token.com.tw/chip-resistor/smd-resistor1.htm
               feedrate: 100,                               // slow feedrate in mm/min
               tapeThick: -1,                               // how thick are the tape
               holeDiameter: 1.5,                           // check parameter "D" in website
               holeBorderDistance: 1.75,                    // check parameter "E" in website
               holeDistance: 4.00,                          // check parameter "Po" in website
               holeComponentDistance:  {x: 3.50, y:2.00 },  // check parameter "F and P2" in website
            },
            trays: {
                // Trays are numbered and pockets has letters
                // x and y coordinates are realtive to zero point of PNP Holder
                tray_1: { name: 'Tray Nr. 1',   width: 8, x: -106, y: 90 },
                tray_2: { name: 'Tray Nr. 2',   width: 8, x: -96,  y: 90 },
                tray_3: { name: 'Tray Nr. 3',   width: 8, x: -86,  y: 90 },
                tray_4: { name: 'Tray Nr. 4',   width: 8, x: -76,  y: 90 },
                tray_5: { name: 'Tray Nr. 5',   width: 8, x: -66,  y: 90 },
                tray_6: { name: 'Tray Nr. 6',   width: 8, x: -56,  y: 90 },
                tray_7: { name: 'Tray Nr. 7',   width: 8, x: -46,  y: 90 },
                tray_8: { name: 'Tray Nr. 8',   width: 8, x: -36,  y: 90 },
            },
            pockets: {
                Pocket_A: { name: 'Pocket A',   width: 15, x: -23, y: 21 },
                Pocket_B: { name: 'Pocket B',   width: 15, x: -23, y: 52 },
                Pocket_C: { name: 'Pocket C',   width: 15, x: -23, y: 71 },
                Pocket_D: { name: 'Pocket D',   width: 15, x: -23, y: 110 },
                Pocket_E: { name: 'Pocket E',   width: 15, x: -4,  y: 110 },
                Pocket_F: { name: 'Pocket F',   width: 15, x: -4,  y: 89 },
                Pocket_G: { name: 'Pocket G',   width: 15, x: 15,  y: 89 },
                Pocket_H: { name: 'Pocket G',   width: 15, x: 34,  y: 89 },
                Pocket_I: { name: 'Pocket H',   width: 15, x: 53,  y: 89 },
                Pocket_K: { name: 'Pocket I',   width: 15, x: 72,  y: 89 },
                Pocket_L: { name: 'Pocket K',   width: 15, x: 91,  y: 89 },
                Pocket_M: { name: 'Pocket L',   width: 15, x: 110, y: 89 },
            },
        },
        // buffer for all founded eagle components
        components: {
            forTrays: {},
            forPockets: {},
            ignored: {},
        },
        // http://www.radio-electronics.com/info/data/resistor/smd_resistor/smd_resistor.php
        packagesTrays: [
            '1206', '1008', '0805', 
            '0603', '0402', 'SOT'
        ],
        packagesPockets: [
            'SOIC', 'SOP', 'QFP', 
            'BGA', 'PLCC', 'SOD', 'DIL.+?SMD'
        ],
        /**
         * Define pubsub signals below. These are basically ChiliPeppr's event system.
         * ChiliPeppr uses amplify.js's pubsub system so please refer to docs at
         * http://amplifyjs.com/api/pubsub/
         */
        /**
         * Define the publish signals that this widget/element owns or defines so that
         * other widgets know how to subscribe to them and what they do.
         */
        publish: {
            // Define a key:value pair here as strings to document what signals you publish.
            //'/onExampleGenerate': 'Example: Publish this signal when we go to generate gcode.'
        },
        /**
         * Define the subscribe signals that this widget/element owns or defines so that
         * other widgets know how to subscribe to them and what they do.
         */
        subscribe: {
            // Define a key:value pair here as strings to document what signals you subscribe to
            // so other widgets can publish to this widget to have it do something.
            // '/onExampleConsume': 'Example: This widget subscribe to this signal so other widgets can send to us and we'll do something with it.'
        },
        /**
         * Document the foreign publish signals, i.e. signals owned by other widgets
         * or elements, that this widget/element publishes to.
         */
        foreignPublish: {
            // Define a key:value pair here as strings to document what signals you publish to
            // that are owned by foreign/other widgets.
        
            "/com-chilipeppr-widget-3dviewer/request3dObject" : 'We need to work with the 3D Viewer and inject content, so by sending out this signal the 3D viewer hears it and sends us back a /recv3dObject with the payload.'
        },
        /**
         * Document the foreign subscribe signals, i.e. signals owned by other widgets
         * or elements, that this widget/element subscribes to.
         */
        foreignSubscribe: {
            // Define a key:value pair here as strings to document what signals you subscribe to
            // that are owned by foreign/other widgets.
            // '/com-chilipeppr-elem-dragdrop/ondropped': 'Example: We subscribe to this signal at a higher priority to intercept the signal. We do not let it propagate by returning false.'
            '/com-chilipeppr-widget-eagle/addGcode' : 'This add-on subscribes to this signal so we can inject our own Gcode into the overall Eagle Widget gcode.',
            '/com-chilipeppr-widget-3dviewer/recv3dObject' : 'We need to get the 3D Viewer so we can inject stuff into it. We must subscribe to this so when we call /request3dObject we get this signal back with the payload of the viewer.'
        },
        /**
         * Holds the reference to the main Eagle Widget that we are an add-on for.
         */
        eagleWidget: null,
        /**
         * All widgets should have an init method. It should be run by the
         * instantiating code like a workspace or a different widget.
         */
        init: function(eagleWidget) {
            
            //if(eagleWidget === undefined)
            //    return;
                        
            this.eagleWidget = eagleWidget;
            console.log("I am being initted. eagleWidget:", this.eagleWidget);

            // first thing we need to do is get 3d obj
            this.get3dObj(function() {
                // when we get here, we've got the 3d obj 
                this.setupUiFromLocalStorage();
                this.subscribeToAddGcodeSignal();
                this.subscribeToBeforeRender();
                this.injectTab();
            });

            console.log("I am done being initted.");
        },
        /**
         * Inject the solder mask tab into the Eagle Brd Widget
         */
        injectTab: function() {
            
            // create our tab header
            var tabHdrEl = $('<li xclass="active">' +
                '<a href="#' + this.id + 
                '" role="tab" data-toggle="tab">' +
                'Pick&Place</a></li>'
            );
            $('#com-chilipeppr-widget-eagle .panel-body .nav-tabs').append(tabHdrEl);
            
            // move the tab from our html and move it into the correct spot
            var tab = $('#' + this.id).detach();
            $('#com-chilipeppr-widget-eagle .panel-body .tab-content').append(tab);
            tab.removeClass("hidden");
            
            var that = this;
            $('#com-chilipeppr-widget-eagle a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                console.log("PNP tab shown. e:", $(e.target).attr("href"));
                var target = $(e.target).attr("href"); // activated tab
                if (target.match(/#com-chilipeppr-widget-eagle-pickandplace/)) {
                    // we just got shown
                    that.onTabShown();
                } else {
                    that.onTabHide();
                }
            });
        },
        isTabShowing: false,
        /**
         * Holds the pnp 3d object that we show in the 3D viewer.
         */
        pnp3d: null,
        /**
         * widget to know if startet or not.
         */
        started: function(){
            return (this.mySceneGroup == null ? false: true);
        },
        /**
         * When the user clicks to activate our tab, this event is called.
         */
        onTabShown: function() {
            this.isTabShowing = true;
            if (this.mySceneGroup != null){
                this.mySceneGroup.children.forEach(function(child){
                    child.visible = true; 
                });
            } else {
                this.drawpickandplace();
            }
        },
        /**
         * When the user clicks a different tab and this one gets hidden.
         */
        onTabHide: function() {
            console.log('PNP tab hide');
            this.isTabShowing = false;
            this.sceneRemove(this.pnp3d);
        },
        /**
         * When the user move mouse over pocket or tray then display additional info's.
         */
        onMouseOverCallback: function(event, object) {
            var tray = object.object;

            tray.material.opacityBackup = tray.material.opacity;
            tray.material.opacity = 1;            

            // Set infos ...
            console.log('PNP onMouseOverCallback', object);
            var cmp = tray.userData.component || null;
            if(cmp == null) return;

            var names = Object.keys(this.getObjects(tray.userData.component));
            if(cmp)
                var firstElement = this.hash2array(cmp)[0];
            
            this.infoArea.find('.info-title').text(tray.userData.pocketname);
            this.infoArea.find('.info-value').text(firstElement.value || firstElement.name);
            this.infoArea.find('.info-package').text(firstElement.pkg);
            this.infoArea.find('.info-names').text(names.join(','));

            this.infoArea.removeClass('hidden');
            this.infoArea.css('left', tray.userData.x + "px").css('top', tray.userData.y + "px");
            this.eagleWidget.infoPlugin = this.infoArea; // register for mouseoverout
        },
        /**
         * Iterate through the Eagle BRD dimensions XY coordinates and draw
         * a solder mask over the board.
         */
        drawpickandplace: function() {
            var that = this;

            var platform = this.drawPlatform();
            this.sceneAdd( platform );
            var helper = new THREE.EdgesHelper( platform, 0xffffff );
            helper.material.linewidth = 1;
            this.sceneAdd( helper );


            var trays = this.drawTraysandPockets();
            trays.forEach(function(tray){
                that.sceneAdd( tray );
            });

            that.sceneAdd(
                this.drawPCBHolder()
            );
        },
        drawPCBHolder: function(){
            var material = new THREE.MeshPhongMaterial( {
                color: 0xff9999, 
                shading: THREE.FlatShading,
                polygonOffset: true,
                polygonOffsetFactor: 1, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            } );
            var geometry = new THREE.BoxGeometry( 
                this.holderCoordinates.pcbholder.dx, 
                this.holderCoordinates.pcbholder.dy,
                Math.abs( this.holderCoordinates.pcbholder.deep ) 
            );
            var pcbholder = new THREE.Mesh( geometry, material );
            pcbholder.position.set(
                this.holderCoordinates.pcbholder.dx/2,
                this.holderCoordinates.pcbholder.dy/2,
                this.holderCoordinates.pcbholder.deep);
            return pcbholder;
        },
        drawTraysandPockets: function(){
            var trays = [];

            var materialDefaults = {
                color: 0xaaaaaa, 
                transparent: true,
                opacity: 0.5,
                shading: THREE.FlatShading,
                polygonOffset: true,
                polygonOffsetFactor: 1, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            }; 

            for (var trayname in this.holderCoordinates.trays) {
                var componentName = null;
                var material = new THREE.MeshPhongMaterial( materialDefaults  );

                var geometry = new THREE.BoxGeometry( 
                    this.holderCoordinates.trays[trayname].width, 
                    this.holderCoordinates.size.dy,
                    Math.abs( this.holderCoordinates.structure.tapeThick ) 
                );
                var tape = new THREE.Mesh( geometry, material );

                tape.position.set( 
                    this.holderCoordinates.trays[trayname].x,
                    this.holderCoordinates.zero.y,
                    1
                );
                
                // check if this tray set
                var text = this.holderCoordinates.trays[trayname].name;
                var t = this.searchObj(this.components.forTrays, 'TRAY', trayname);
                if( t != null ){
                    tape.material.color.setHex( 0xeeffee );
                    componentName = t[0];
                    text = ' [ ' + t[0] + ' ]';
                }
                
                // Display tray txt
                var tapeTxt = this.obj3dmeta.widget.makeText({
                    x: 1,
                    y: 0-(this.holderCoordinates.size.dy/2)+10,
                    z: 1,
                    text: text,
                    color: '#000000',
                    opacity: 0.6,
                    size: 2
                });
                this.rotateObject(tapeTxt, 90);
                tape.add(tapeTxt);
                if(componentName != null)
                    tape.userData.component = this.components.forTrays[componentName];
                tape.userData.pocketname = this.holderCoordinates.trays[trayname].name;
                trays.push(tape);
            }

            for (var pocketname in this.holderCoordinates.pockets) {
                var componentName = null;
                materialDefaults.color = 0xaaaaff;
                var material = new THREE.MeshPhongMaterial( materialDefaults );
                var geometry = new THREE.BoxGeometry( 
                    this.holderCoordinates.pockets[pocketname].width, 
                    this.holderCoordinates.pockets[pocketname].width, 
                    Math.abs( this.holderCoordinates.structure.tapeThick ) 
                );
                var pocket = new THREE.Mesh( geometry, material );
                pocket.position.set( 
                    this.holderCoordinates.pockets[pocketname].x + this.holderCoordinates.zero.x,
                    this.holderCoordinates.pockets[pocketname].y,
                    1
                );
                // check if this tray set
                var text = this.holderCoordinates.pockets[pocketname].name;
                var t = this.searchObj(this.components.forPockets, 'POCKET', pocketname);
                if( t != null ){
                    pocket.material.color.setHex( 0xaaffaa );
                    componentName = t[0];
                    text = '[' + t[0] + ']';
                }

                // Display pocket txt
                var pocketTxt = this.obj3dmeta.widget.makeText({
                    x: 0-(this.holderCoordinates.pockets[pocketname].width/2)+1,
                    y: 1,
                    z: 1,
                    text: text,
                    color: '#000000',
                    opacity: 0.6,
                    size: 2
                });
                pocket.add(pocketTxt);
                if(componentName != null)
                    pocket.userData.component = this.components.forPockets[componentName];
                pocket.userData.pocketname = this.holderCoordinates.pockets[pocketname].name;

                trays.push(pocket);
            }

            var that = this;
            // add to onMouseOver event to every tray or pocket to display 
            // a window with additional informations 
            trays.forEach(function(tray) {
                tray.userData.onMouseOverCallback = function(event, object){
                    if(object.onMouse == true)
                        return;
                    object.onMouse = true;
                    // console.log('PNP get onMouseOverCallback', event, object);
                    that.onMouseOverCallback(event, object);
                    object.onMouse = false;
                };
                that.eagleWidget.intersectObjects.push( tray );
            });

            return trays;
        },
        drawPlatform: function(){
            // Build box as platform
            /*
            var geometry = new THREE.BoxGeometry( 
                this.holderCoordinates.size.dx, 
                this.holderCoordinates.size.dy, 
                this.holderCoordinates.size.dz 
            );
            var material = new THREE.MeshBasicMaterial( { 
                     color: '#666666',
                     wireframe : false,
                     transparent: true,
                     opacity: 0.1
            } );
            */
            var platform = this.drawBox(this.holderCoordinates.size.dx, this.holderCoordinates.size.dy);
            platform.position.set( 
                0-((this.holderCoordinates.size.dx/2) - this.holderCoordinates.zero.x),
                0-((this.holderCoordinates.size.dy/2) - this.holderCoordinates.zero.y),
                0
            );

            return platform;
        },
        drawBox: function(blength, bwidth) {
           var material = new THREE.LineBasicMaterial({
              color: 0x777777
           });
        
           var geometry = new THREE.Geometry();
           geometry.vertices.push(
              new THREE.Vector3( 0, 0, 0 ),
              new THREE.Vector3( 0, bwidth, 0 ),
              new THREE.Vector3( blength, bwidth, 0 ),
              new THREE.Vector3( blength, 0, 0 ),
              new THREE.Vector3( 0, 0, 0 )
           );
        
           return new THREE.Line( geometry, material );
        },
        /**
         * We subscribe to the main Eagle Widget's addGcode publish signal
         * so that we can inject our own Gcode to the main widget.
         */
        subscribeToAddGcodeSignal: function() {
            console.log('run subscribeToAddGcodeSignal');
            chilipeppr.subscribe("/com-chilipeppr-widget-eagle/addGcode", this, this.onAddGcode);
        },
        /**
         * We subscribe to the main Eagle Widget's addGcode publish signal
         * so that we can inject our own Gcode to the main widget.
         */
        subscribeToBeforeRender: function() {
            console.log('run /com-chilipeppr-widget-eagle/beforeToolPathRender');
            chilipeppr.subscribe("/com-chilipeppr-widget-eagle/beforeToolPathRender", this, this.onBeforeRender);
        },
        /**
         * This is our callback that gets called when the /com-chilipeppr-widget-eagle/addGcode
         * signal is published by the main Eagle Widget. This is where we get to actually
         * inject our own Gcode to the final overall Gcode.
         */
        onAddGcode : function(addGcodeCallback, gcodeParts, eagleWidget, helpDesc){
            console.log("Got onAddGcode:", arguments);

            // if PNP widget startet (user activate the PNP Tab)
            if(! this.started())
                return;

            if( $('#' + this.id).find('.onlypnpgcode').is(':checked') ){
                // remove all milling code for testing or to choose only pnp
                for(var i = 200;i<=1499;i++){
                    gcodeParts[i] = undefined;
                    
                }
            }

            // if user don't want produce pnp gcode
            if($('#' + this.id).find('.activepnpgcode').is(':checked') ){
                addGcodeCallback(1500, this.exportGcodepickandplace(eagleWidget) );
            }
            else {
                gcodeParts[1500] = undefined;
            }
        },
        /**
         * After Render Register all components and sort to the trays and pockets
         */
        onBeforeRender : function(self){
            console.log("Get onBeforeRender:", self);
            this.registerEagleComponents(self);
            this.sortTrayComponents();
            this.sortPocketComponents();
            this.setupComponentsTable();

            if( this.isTabShowing ){
                var that = this;
                console.log("Tab are showing, regenerate pnp holder", this.isTabShowing);
                setTimeout(function(){
                    that.mySceneGroup = null;
                    that.onTabShown();
                }, 2000);
            }
        },
        /**
         * Display table with all components sortet to the trays and pockets.
         */
        setupComponentsTable: function(){
            console.group("setupComponentsTable");
            var tableRows = [], 
                that = this;

            var buildRow = function(elemValue, ignored){
               var data = that.components.forTrays[ elemValue ] 
                            || that.components.forPockets[ elemValue ]
                            || that.components.ignored[ elemValue ];
               var names = [], 
                   packages = '',
                   rotation = [];
               for(var value in data){
                  names.push(data[value].name);
                  if($.type(data[value]) == 'object'){
                    packages = data[value].pkg;
                    rotation.push(data[value].rot);
                  }
               }
               // collect data and display in a table row
               if($.type(data) == 'object')
                   tableRows.push([
                      (Object.keys(data).length -1),
                      elemValue,
                      packages,
                      rotation.join(', '),
                      names.join(', '),
                      (ignored 
                        ? '<b>Ignored</b>' 
                        : '<select id="trays_' + elemValue.replace(/\./ig, '_') + '" class="pnp-select" />')
                   ]);  
            }

            // setup table content
            for (var elemValue in this.components.forTrays) {
                buildRow(elemValue);
            }
            for (var elemValue in this.components.forPockets ) {
                buildRow(elemValue);
            }
            for (var elemValue in this.components.ignored ) {
                buildRow(elemValue, 'ignored');
            }
            this.table('#pnp-component-list', tableRows);

            // Fill selectboxes
            var output = function(entry){ 
               return entry.name + ' (' + entry.width + 'mm)';
            };
            var buildSelectbox = function(elemValue, type){
               var d = that.components.forTrays[ elemValue ]
                        || that.components.forPockets[ elemValue ];
               if($.type(d) == 'object')
                   that.selectbox(
                      '#trays_' + elemValue.replace(/\./ig, '_'), 
                      that.holderCoordinates[ type ],
                      output, 
                      (type == 'trays' ? d.TRAY : d.POCKET) 
                   );
            }
            for (var elemValue in this.components.forTrays) {
                buildSelectbox(elemValue, 'trays');
            }
            for (var elemValue in this.components.forPockets) {
                buildSelectbox(elemValue, 'pockets');
            }

            console.groupEnd();
        },
        /**
         * Read all eagle components and decide for try or pocket or ignore.
         */
        registerEagleComponents: function(self){
            console.group("registerEagleComponents");
            
            // refresh, remove old entrys
            this.components['forTrays'] = {};
            this.components['forPockets'] = {};
            this.components['ignored'] = {};
            
            // Analyze the eagle elements and save this in a local buffer 
            // sorted by trays or pockets and his values or names      
            for (var elemKey in self.eagle.elements) {
                var elem = self.eagle.elements[elemKey];
                var pkg = self.eagle.packagesByName[elem.pkg];
                this.packagesByName = self.eagle.packagesByName;
                console.log("working on element:", elem, pkg);

                // sort all components to tray or pockets sortet via value
                var that = this,
                    found = 0;
                var key = elem.value || elem.name;
                key = key.replace(/\./ig, '-');

                // try to find in packagesTray
                var packagesTrays = this.options.packagesTrays || this.packagesTrays;
                packagesTrays.forEach(function(type){
                    var re = new RegExp(type, 'gi');
                    if(pkg.name.match(re)){
                        found++
                        if(that.components['forTrays'][key] === undefined)
                           that.components['forTrays'][key] = {};
                        that.components['forTrays'][key][elem.name] = elem;
                    }
                });

                // try to find in packagesPockets
                var packagesPockets = this.options.packagesPockets || this.packagesPockets;
                if(found == 0)
                    packagesPockets.forEach(function(type){
                        var re = new RegExp(type, 'gi');
                        if(pkg.name.match(re)){
                            found++
                            if(that.components['forPockets'][key] === undefined)
                               that.components['forPockets'][key] = {};
                            that.components['forPockets'][key][elem.name] = elem;
                        }
                    });
                if(found == 0){
                    if(that.components['ignored'][key] === undefined)
                       that.components['ignored'][key] = {};
                    that.components['ignored'][key][elem.name] = elem;
                }

            }
            console.groupEnd();
        },
        /**
         * Sort all components to trays for the shortest move between tray and component place.
         */
        sortTrayComponents: function(){
            console.group("sortTrayComponents");
            // calculate distace and sort components to tray numbers
            var sorthash = [];
            var sortaxis = this.components.forTrays.sortAxis; // TODO: use this sortaxis
            for (var elemValue in this.components.forTrays) {
                var sum = 0, i = 0;
                for (var elemKey in this.components.forTrays[elemValue]) {
                    sum += this.components.forTrays[elemValue][elemKey].x;
                }
                sorthash.push( {k: elemValue, v: (sum / i).toFixed(4)} );
            }
            // sort from min to max
            sorthash.sort(function (a, b) {
                return ( a.v - b.v );
            });
            console.log('PNP sorthash', sorthash);

            var trays = [];
            $.each(this.holderCoordinates.trays, function(key, value) {
               // make all trays to width = 8mm ... done
               trays.push( {k: key, v: value.x} ); // try to get sortAxis
            });
            trays.sort(function (a, b) {
                return ( b.v - a.v );
            });
            console.log('PNP trayssort', trays);

            // set element to tray
            var i = 0, that = this;
            sorthash.forEach(function(entry){
                entry.t = trays[i++].k;                      
                that.components.forTrays[entry.k]['TRAY'] = entry.t;
            });
            console.log('PNP Object: ', this);

            console.groupEnd();

            return sorthash;
        },
        /**
         * Sort all components to pockets for the shortest move between pocket and component place.
         */
        sortPocketComponents: function(){
            console.group("sortPocketComponents");
            // calculate distace and sort components to tray numbers
            var sorthash = [];
            for (var elemValue in this.components.forPockets ) {
                var sum = 0, i = 0;
                for (var elemKey in this.components.forPockets[elemValue]) {
                    sum += this.components.forPockets[elemValue][elemKey].x + this.components.forPockets[elemValue][elemKey].y;
                }
                sorthash.push( {k: elemValue, v: (sum / i).toFixed(4)} );
            }
            // sort from min to max
            sorthash.sort(function (a, b) {
                return ( a.v - b.v );
            });
            console.log('PNP sorthash', sorthash);

            var pockets = [];
            $.each(this.holderCoordinates.pockets, function(key, value) {
               // make all trays to width = 8mm ... done
               pockets.push( {k: key, v: (value.x + value.y)} ); // try to get sortAxis
            });
            pockets.sort(function (a, b) {
                return ( a.v - b.v );
            });
            console.log('PNP pocketssort', pockets);

            // set element to tray
            var i = 0, that = this;
            sorthash.forEach(function(entry){
                entry.t = pockets[i++].k;                      
                that.components.forPockets[entry.k]['POCKET'] = entry.t;
            });
            console.log('PNP Object: ', this);

            console.groupEnd();

            return sorthash;
        },
        /** 
         * empty and fill html select box 
        */
        selectbox: function(id, hash, outcallback, selected){
            $(id).find('option').remove().end();
            if(selected !== undefined)
               $(id).append(
                  $('<option></option>').val('').html('not selected')
               );
            $.each(hash, function(key, value) {
                $(id).append(
                    $('<option></option>').val(key).html(( outcallback ? outcallback(value) : key))
                );
            });
            if(selected !== undefined)
               $(id).val(selected);
        },
        /** 
         * empty and fill html table 
        */
        table: function(id, array){
            $(id).find("tr:gt(0)").remove();
            $.each(array, function(idx, entry) {
                var content = '<tr>';
                $.each(entry, function(idx, value) {
                    content += '<td>' + value + '</td>';  
                });
                content += '</tr>';
                $(id + ' tr:last').after(content);        
            });
        },
        /**
         * Generate the gcode for pnp
         */
        exportGcodepickandplace: function(eagleWidget) {
            var g = "";
            g += "(------ Pick and Place Moves -------)\n";
            g += "( Each smd component has a pick&place strategy )\n";
            g += "( this use a vacuum suction solenoid and stepper to rotate sm in correct position )\n";
            g += "( use a special PnP Holder )\n";

            /* 
            Strategy to get a component and place it
            iterate over components.forTrays
            create follow plan:

               1. move to zero point of tray
               2. call this.tapeStrategy(cmp) to get component from tray
               3. call vacum(true) to generate special command 
               4. move to cmp position
               5. call vacum(false) to generate special command
            */
            for (var elemValue in this.components.forTrays) {
               var evalue = this.components.forTrays[ elemValue ];
               for (var cmpName in evalue ) {
                  if($.type(evalue[cmpName]) != 'object')
                     continue; // ignore tray entrys

                  // get cmp from tray
                  g += this.tapeStrategy( evalue[cmpName], evalue['TRAY'] );
                  g += this.rotateStrategy( evalue[cmpName] );
                  g += "G0 X" + evalue[cmpName].x + " Y" + evalue[cmpName].y + "\n";
                  g += this.putStrategy( evalue[cmpName] );
               }
            }

            for (var elemValue in this.components.forPockets ) {
               var evalue = this.components.forPockets[ elemValue ];
               for (var cmpName in evalue ) {
                  if($.type(evalue[cmpName]) != 'object')
                     continue; // ignore tray entrys

                  g += this.rotateStrategy( evalue[cmpName] );
                  g += "G0 X" + evalue[cmpName].x + " Y" + evalue[cmpName].y + "\n";
                  g += this.putStrategy( evalue[cmpName] );
               }
            }

            console.log('PNP gcode: ', g);

            return g;
        },
        rotateStrategy: function(cmp){
            var g = '';
            // get cmp from tray
            var rotate = cmp.rot;
            rotate = parseInt(rotate.replace(/\D+/ig, ''));
            if(rotate)
                rotate = rotate / 10;
            console.log('PNP rotate', rotate);
            // we choose a stepper with 200 steps for 360°
            // $103=55.55 ... rotate for 90° = 0.9, rotate for 180° = 1.8
            g += "(chilipeppr_pause rotate" + " G1 F100 " + this.rotateAxis + rotate + ")\n";
            return g;
        },
        
        /**
         * Strategy in gcode to put a cmp to pcb.
         */
        putStrategy: function(cmp){
           var g = "";
           g += "(---- put " + cmp.name + " to pcb" + " ----- )\n";

           g += "G0 Z" + this.holderCoordinates.pcbThick +  "\n"; // move down to pcb surface
           g += "(chilipeppr_pause vacuum false)\n"; // vacuum off
           g += "G0 Z" + this.safetyHeight + "\n";
           
           return g;
        },
        /**
         * return width and height from cmp.
         */
        size: function(cmp){
            var bbox = this.packagesByName[cmp.pkg].bbox, 
                dx = 0, 
                dy = 0;
            dx = (Math.abs(bbox[0]) + Math.abs(bbox[2]));
            dy = (Math.abs(bbox[1]) + Math.abs(bbox[3]));
            return { dx: dx, dy: dy };
        },
        // please check this: 
        // http://www.token.com.tw/chip-resistor/smd-resistor1.htm
        /**
         * return gcode to get cmp from pocket.
         */
        pocketStrategy: function(cmp, pocketname){
           var g = "";
           g += "(---- get " + cmp.name + " from " + pocketname + " ----- )\n";
           var structure = this.holderCoordinates.structure;
           var pocket = this.holderCoordinates.pockets[ pocketname ];
           var size = this.size(cmp);

           g += "G0 Z" + this.safetyHeight + "\n";
           g += "G0 X" + pocket.x + "Y" + pocket.y + "\n";         // now we moved to zero pint of tray

           g += "G91" + "\n";                                  // set to relative coordination system
           g += "G0 X"+ (size.dx/2).toFixed(4) + " Y" + (size.dy/2).toFixed(4) + " Z-" + this.safetyHeight + "\n";
           g += "(chilipeppr_pause vacuum true)\n"; // move to center of cmp

           g += "G90" + "\n";                                  // set to relative coordination system
           g += "G0 Z" + this.safetyHeight + "\n";
           
           return g;
        },
        // please check this: 
        // http://www.token.com.tw/chip-resistor/smd-resistor1.htm
        /**
         * return gcode to get cmp from tape.
         */
        tapeStrategy: function(cmp, trayname){
           var g = "";
           g += "(---- get " + cmp.name + " from " + trayname + " ----- )\n";
           var tray = this.holderCoordinates.trays[ trayname ];
           var structure = this.holderCoordinates.structure;
           var dia = this.nozzleDiameter;
           var nozzlediff = ((structure.holeDiameter/2)-(dia/2));
           
           g += "G0 Z" + this.safetyHeight + "\n";
           g += "G0 X" + tray.x + "Y" + tray.y + "\n";         // now we moved to zero pint of tray

           g += "G91" + "\n";                                  // set to relative coordination system
           g += "G0 X" + structure.holeBorderDistance  + "\n"; // move over the center of first hole
           g += "G0 Z-" + this.safetyHeight  + "\n";      // go down to zero  z-axis
           g += "G1 F" + structure.feedrate + "Z" + structure.tapeThick  + "\n";      // go into the hole
           g += "(nozzleDiameter: " + dia + " holediameter: " + structure.holeDiameter + " nozzlediff: " + nozzlediff +" )\n";
           g += "G1 F" + structure.feedrate + " Y" + (structure.holeDistance + nozzlediff)  + "\n"; // go up in Y Axis to get next component
           g += "G0 Z" + this.safetyHeight + "\n";
           g += "G0 Z-" + this.safetyHeight + " Y-" + (structure.holeComponentDistance.y + nozzlediff) + " X" + structure.holeComponentDistance.x + "\n"; // move to center of cmp
           g += "(chilipeppr_pause vacuum true)\n"; // move to center of cmp

           g += "G90" + "\n";                                  // set to relative coordination system
           g += "G0 Z" + this.safetyHeight + "\n";
           
           return g;
        },
        /**
         * return 3dobject from 3dviewer.
         */
        get3dObj: function (callback) {
            this.userCallbackForGet3dObj = callback;
            chilipeppr.subscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this, this.get3dObjCallback);
            chilipeppr.publish("/com-chilipeppr-widget-3dviewer/request3dObject", "");
            chilipeppr.unsubscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this.get3dObjCallback);
        },
        get3dObjCallback: function (data, meta) {
            console.log("got 3d obj:", data, meta);
            this.obj3d = data;
            this.obj3dmeta = meta;
            if (this.userCallbackForGet3dObj) {
                this.userCallbackForGet3dObj();
                this.userCallbackForGet3dObj = null;
            }
        },
        mySceneGroup: null,
        sceneAdd: function (obj) {
            // let's add our Eagle BRD content outside the scope of the Gcode content
            // so that we have it stay while the Gcode 3D Viewer still functions
            if (this.mySceneGroup == null) {
                this.mySceneGroup = new THREE.Group();
                this.obj3d.add(this.mySceneGroup);
            }
            this.mySceneGroup.add(obj);
            // you need to wake up the 3d viewer to see your changes
            // it sleeps automatically after 5 seconds to convserve CPU
            this.obj3dmeta.widget.wakeAnimate();
        },
        sceneRemove: function (obj) {
            console.log('PNP mySceneGroup', this.mySceneGroup);
            if (this.mySceneGroup != null){
                this.mySceneGroup.children.forEach(function(child){
                    child.visible = false; 
                });
            }
            //this.mySceneGroup.remove(obj);
            this.obj3dmeta.widget.wakeAnimate();
        },
        rotateObject: function(object, degrees){
            var r = (Math.PI / 180) * degrees;
            var axis = new THREE.Vector3(0, 0, 1);
            var rotObjectMatrix = new THREE.Matrix4();
            rotObjectMatrix.makeRotationAxis(axis.normalize(), r);
            object.matrix.multiply(rotObjectMatrix);
            object.rotation.setFromRotationMatrix(object.matrix);
            return object;
        },
        /**
         * User options are available in this property for reference by your
         * methods. If any change is made on these options, please call
         * saveOptionsLocalStorage()
         */
        options: null,
        /**
         * Call this method on init to setup the UI by reading the user's
         * stored settings from localStorage and then adjust the UI to reflect
         * what the user wants.
         */
        setupUiFromLocalStorage: function() {

            // Read vals from localStorage. Make sure to use a unique
            // key specific to this widget so as not to overwrite other
            // widgets' options. By using this.id as the prefix of the
            // key we're safe that this will be unique.

            // Feel free to add your own keys inside the options 
            // object for your own items

            var options = localStorage.getItem(this.id + '-options');
            
            
            if (options) {
                options = $.parseJSON(options);
                console.log("just evaled options: ", options);
            }
            else {
                options = {
                    //showBody: true,
                    tabShowing: 1,
                };
            }

            this.options = options;
            console.log("options:", options);

            // init ui 
            var that = this;            
            this.selectbox('.pnpholders', this.pnpholders);

            // load json definition for holder
            /*
            var el = $('#' + that.id);
            $.getJSON( this.pnpholders[ el.find('.pnpholders').val() ] + ".json?callback=?", function( data ) {
                console.log('pnp load holderCoordinates', data);
                that.holderCoordinates = data;                
            });
            */

            this.renderArea = $('#com-chilipeppr-widget-3dviewer-renderArea');
            this.infoArea = $('.com-chilipeppr-widget-eagle-pickandplace-info-tray');
            this.infoArea.prependTo(this.renderArea);

            $('#pnp-refresh').click(function(evt){
               that.setupComponentsTable();
            });

            // register input field 'safetyHeight' to change and options
            that.reginput('safetyHeight');
            that.reginput('rotateAxis');
            that.reginput('nozzleDiameter');
            that.reginput('packagesTrays');
            
            that.reginput();
        },
        /**
         * Register input field as change event and as entry in this.options.
         * also recognize loaded data from localspace (options)
         */
        reginput: function(field){
            var el = $('#' + this.id);

            if(field !== undefined){
                // get field input from user and register a changed event
                var that = this;
                el.find('.' + field).change(function(evt) {
                    console.log("evt:", evt);
                    var value = evt.currentTarget.value;
                    that.options[field] = that.getValue(value, that[field]);
                    console.log(that.options);
                    that.saveOptionsLocalStorage();
                });
            }
            else {
                if(this.options['packagesTrays'] === undefined){
                    this.options.packagesTrays   = this.packagesTrays;
                    this.options.packagesPockets = this.packagesPockets;
                }
                console.log('Options', this.options );
                for(var key in this.options){
                    // read from options, set and trigger change
                    el.find('.' + key).val(this.setValue(this.options[key], key));
                }
            }
        },
        setValue: function(value){
            if( $.type(value) == 'array' )
                return value.join(',');

            if( $.type(value) == 'boolean' )
                return (value ? true : false);
            
            return value;
        },
        getValue: function(value, entry){
            if( $.type(entry) == 'array' )
                return value.split(',');

            if( $.type(entry) == 'number' )
                return parseFloat(value);

            if( $.type(entry) == 'string' )
                return value;

            if( $.type(entry) == 'boolean' )
                return (value ? true : false);
            
            return value;
        },
        /**
         * When a user changes a value that is stored as an option setting, you
         * should call this method immediately so that on next load the value
         * is correctly set.
         */
        saveOptionsLocalStorage: function() {
            // You can add your own values to this.options to store them
            // along with some of the normal stuff like showBody
            var options = this.options;

            // save all changed data to root object
            for(var key in options){
                this[key] = options[key];
            }
            var optionsStr = JSON.stringify(options);
            console.log("saving options:", options, "json.stringify:", optionsStr);
            // store settings to localStorage
            localStorage.setItem(this.id + '-options', optionsStr);
        },
        /**
         * This method loads the pubsubviewer widget which attaches to our 
         * upper right corner triangle menu and generates 3 menu items like
         * Pubsub Viewer, View Standalone, and Fork Widget. It also enables
         * the modal dialog that shows the documentation for this widget.
         * 
         * By using chilipeppr.load() we can ensure that the pubsubviewer widget
         * is only loaded and inlined once into the final ChiliPeppr workspace.
         * We are given back a reference to the instantiated singleton so its
         * not instantiated more than once. Then we call it's attachTo method
         * which creates the full pulldown menu for us and attaches the click
         * events.
         */
        forkSetup: function() {
            var topCssSelector = '#' + this.id;

            $(topCssSelector + ' .panel-title').popover({
                title: this.name,
                content: this.desc,
                html: true,
                delay: 1000,
                animation: true,
                trigger: 'hover',
                placement: 'auto'
            });

            var that = this;
            chilipeppr.load("http://fiddle.jshell.net/chilipeppr/zMbL9/show/light/", function() {
                require(['inline:com-chilipeppr-elem-pubsubviewer'], function(pubsubviewer) {
                    pubsubviewer.attachTo($(topCssSelector + ' .panel-heading .dropdown-menu'), that);
                });
            });

        },
        getObjects: function(hash){
           var ret = {};
           for(var name in hash){
              if($.type(hash[name]) == 'object'){
                ret[name] = hash[name];
              }
           }
           return ret;
        },
        hash2array: function(hash){
            var ret = null;
            for (var name in hash) {
                if(ret == null)
                    ret = [];
                ret.push(hash[name]);
            }
            return ret;
        },
        // i.e.: this.searchObj(this.components.forTrays, 'TRAY', 'tray_6')
        searchObj: function(obj, path, search){
            var result = null;
            for (var name in obj) {
               if(obj[name][path] == search){
                  if(result == null)
                     result = [];
                  result.push(name);
               }
            }
            return result;
        },
    }
});