const WebSocket = require('ws');

console.log('Welcome');

const wss = new WebSocket.Server({ port: 8888 });
// Create a `HvcP2` object

// Load the node-omron-hvc-p2 and get a `HvcP2` constructor object
const HvcP2_1 = require('node-omron-hvc-p2');
const hvcp2_1 = new HvcP2_1();

const HvcP2_2 = require('node-omron-hvc-p2');
const hvcp2_2 = new HvcP2_2();

const HvcP2_3 = require('node-omron-hvc-p2');
const hvcp2_3 = new HvcP2_3();

console.log('CAM connecting.');
var global_res_json;
var connected=false;
var new_data=false;
var inizialized=false;
var record_toggle=false;
var recording=false;
var rec_start=Date.now();
var trial_name='noName';
var current_condition=0;
var array_cam=[0, 0, 0, 0];
var array_index=0;
var cam_position=0;
var player = require('play-sound')(opts = {})

hvcp2_1.connect({
    path: '/dev/tty.usbmodem11'
}).then(() => {
    hvcp2_1.setConfigurations({
        cameraAngle: {
            angle: 3 // Camera angle: 270º 
        }
    }).then((res) => {
        console.log('HVC Cam 1 set up');
    }).catch((error) => {
        console.error(error);
    });
    array_cam[array_index]=1;
    array_index++;
    console.log('HVC Cam 1 ready');
    setTimeout(() => {
        detectFor_1();
    }, 1000);
}).catch((error) => { //connect
    console.error(error);
});

async function detectFor_1(){
    //Needs to be in an async function to use await
    var res_json;  
    while (true) {
        await hvcp2_1.detect({
            face: 1,
            direction: 1,
            age: 1,
            gender: 1,
            gaze: 1,
            expression: 1
        }).then((res) => {
            res_json=res;
        }).catch((error) => {
            console.error(error);
            process.exitCode = 1;
        });
        global_res_json=res_json;
        
        cam_position=0;
        for (var i=0;i<array_cam.length;i++){
            if (array_cam[i]==1) cam_position=i;
        }        
        global_res_json.Camera = cam_position+1;

        if(res_json["face"].length > 0){
            for (var i=0;i<res_json["face"].length;i++){
                var yaw=res_json["face"][i]["gaze"]["yaw"];
                var pitch=res_json["face"][i]["gaze"]["pitch"];
                //console.log('1 F:'+i+':'+'GY:'+yaw+':'+pitch+'.');
            }

        }else{
            //console.log('No face 1');
        }        
        new_data=true;
    }//While
}

hvcp2_2.connect({
    path: '/dev/tty.usbmodem4'
}).then(() => {
    hvcp2_2.setConfigurations({
        cameraAngle: {
            angle: 3 // Camera angle: 270º 
        }
    }).then((res) => {
        console.log('HVC Cam 2 set up');
    }).catch((error) => {
        console.error(error);
    });
    array_cam[array_index]=2;
    array_index++;
    console.log('HVC Cam 2 ready');
    setTimeout(() => {
        detectFor_2();
    }, 1000);
}).catch((error) => { //connect
    console.error(error);
});

async function detectFor_2(){
    //Needs to be in an async function to use await
    var res_json;  
    while (true) {
        await hvcp2_2.detect({
            face: 1,
            direction: 1,
            age: 1,
            gender: 1,
            gaze: 1,
            expression: 1
        }).then((res) => {
            res_json=res;
        }).catch((error) => {
            console.error(error);
            process.exitCode = 1;
        });
        global_res_json=res_json;
        cam_position=0;
        for (var i=0;i<array_cam.length;i++){
            if (array_cam[i]==2) cam_position=i;
        }
        
        global_res_json.Camera = cam_position+1;

        if(res_json["face"].length > 0){
            for (var i=0;i<res_json["face"].length;i++){
                var yaw=res_json["face"][i]["gaze"]["yaw"];
                var pitch=res_json["face"][i]["gaze"]["pitch"];
                //console.log('2 F:'+i+':'+'GY:'+yaw+':'+pitch+'.');
            }

        }else{
            //console.log('No face 2');
        }
        new_data=true;
        
        

    }//While
}

hvcp2_3.connect({
    path: '/dev/tty.usbmodem5'
}).then(() => {
    hvcp2_3.setConfigurations({
        cameraAngle: {
            angle: 3 // Camera angle: 270º 
        }
    }).then((res) => {
        console.log('HVC Cam 3 set up');
    }).catch((error) => {
        console.error(error);
    });
    array_cam[array_index]=3;
    array_index++;
    console.log('HVC Cam 3 ready');
    setTimeout(() => {
        detectFor_3();
    }, 1000);
}).catch((error) => { //connect
    console.error(error);
});

async function detectFor_3(){
    //Needs to be in an async function to use await
    var res_json;  
    while (true) {
        await hvcp2_3.detect({
            face: 1,
            direction: 1,
            age: 1,
            gender: 1,
            gaze: 1,
            expression: 1
        }).then((res) => {
            res_json=res;
        }).catch((error) => {
            console.error(error);
            process.exitCode = 1;
        });
        global_res_json=res_json;
        
        cam_position=0;
        for (var i=0;i<array_cam.length;i++){
            if (array_cam[i]==3) cam_position=i;
        }
        
        global_res_json.Camera =cam_position+1;
        if(res_json["face"].length > 0){
            for (var i=0;i<res_json["face"].length;i++){
                var yaw=res_json["face"][i]["gaze"]["yaw"];
                var pitch=res_json["face"][i]["gaze"]["pitch"];
                //console.log('3 F:'+i+':'+'GY:'+yaw+':'+pitch+'.');
            }
        }else{
            //console.log('No face 3');
        }
        new_data=true;

    }//While
}



wss.on('connection', function connection(ws) {
    console.log('connected to websocket');
    console.log('Number connections: '+wss.clients.size);
    ws.on('close', function close() {
        //connected=false;
        /*hvcp2_R.disconnect().then(() => {
            console.log('Disconnecting.');
        }).catch((error) => {
            console.error(error);
        });*/
        if (wss.clients.size==0){
            connected=false;
        }
        console.log('disconnected');
    });

    if (!inizialized){
        setInterval(function() {
            inizialized=true;
            if (new_data==true){
                new_data=false;
                //ws.send(JSON.stringify(global_res_json));
                wss.clients.forEach(function each(client) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(global_res_json));
                    }
                });
            }
        }, 10);
    }
    connected=true;

    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        var object = JSON.parse(message);
        if(object.hasOwnProperty('command')){
            console.log('json: %s', object['command']);
            if (object['command'].hasOwnProperty('condition')){
                global_res_json = {"command"  :  "condition "+object['command']['condition']['number']}
                new_data=true;
                console.log('switch to condition '+object['command']['condition']['number']+' now');
                current_condition=object['command']['condition']['number'];
                trial_name=object['command']['condition']['trial'];
                rec_start=Date.now();
                recording=true;
                if ((record_toggle==true)&&(recording==true)){
                    ensureExists(__dirname +'/'+trial_name, 484, function(err) {
                        if (err) console.log('Cannot create folder: '+err);// handle folder creation error
                        else{
                            ensureExists(__dirname+'/'+trial_name+'/Condition'+current_condition, 484, function(err) {
                                if (err) console.log('Cannot create folder: '+err);// handle folder creation error
                                //else // we're all good
                            });
                        }
                        //else // we're all good
                    });
                }
                console.log('starting record Condition '+object['command']['condition']['number']+' with name '+trial_name);
            }else if (object['command']=='home'){
                global_res_json = {"command"  :  "home"}
                new_data=true;
                console.log('switch to home');
                console.log('stop recording'); 
                recording=false;
            }else if (object['command']=='start'){
                console.log('start loggin');
                record_toggle=true;
            }else if (object['command']=='stop'){
                console.log('stop loggin');
                record_toggle=false;
            }else if (object['command']=='dingL'){
                global_res_json = {"command"  :  "dingL"}
                new_data=true;
                console.log('sending DingL');
                player.play('DingDong.mp3', function (err) {
                    if (err) throw err;
                });
            }else if (object['command']=='dingC'){
                global_res_json = {"command"  :  "dingC"}
                new_data=true;
                console.log('sending DingC');
                player.play('DingDong.mp3', function (err) {
                    if (err) throw err;
                });
            }else if (object['command']=='dingR'){
                global_res_json = {"command"  :  "dingR"}
                new_data=true;
                console.log('Sending DingR');
                player.play('DingDong.mp3', function (err) {
                    if (err) throw err;
                });
            }else if (object['command'].hasOwnProperty('number_ring')){
                global_res_json = object;
                new_data=true;
                console.log('sending number to ring');
                player.play('DingDong.mp3', function (err) {
                    if (err) throw err;
                });
                if ((record_toggle==true)&&(recording==true)){
                    var event_res_json={
                        "event": {
                            "condition": 'condition '+current_condition,
                            "time": Date.now(),
                            "dingdong":{
                                "door":object['command']["number_ring"]["door"],
                                "door_numer_main":object['command']["number_ring"]["number_active"],
                                "number_pasive":object['command']["number_ring"]["number_pasive"],
                            }
                        }
                    }
                    let data = JSON.stringify(event_res_json, null, 2);
                    var fs = require('fs');
                    fs.appendFile(trial_name+'/Condition'+current_condition+'/'+rec_start+'.json', data,(err) => {
                        if (err) throw err;
                        console.log('Data written to file');
                    });
                }
            }else{
                console.log('Unknown command');
            }  
        }else if ((object.hasOwnProperty('event'))&&(record_toggle==true)&&(recording==true)){
            object['event']['ip']=ws._socket.remoteAddress;
            let data = JSON.stringify(object, null, 2);
            var fs = require('fs');
            fs.appendFile(trial_name+'/Condition'+current_condition+'/'+rec_start+'.json', data,(err) => {
                if (err) throw err;
                console.log('Data written to file');
            });
        }
    });
    //ws.send('hello world');
});


function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') { // allow the `mask` parameter to be optional
        cb = mask;
        mask = 484;
    }
    var fs = require('fs');
    fs.mkdir(path, mask, function(err) {
        if (err) {
            if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
            else cb(err); // something else went wrong
        } else cb(null); // successfully created folder
    });
}