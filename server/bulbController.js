//Bulb Controller object
const { raw } = require('express');
const e = require('express');
const lightRing = require('./lightRing');
//const logger = require('pino')('./bulbLogs.log'); //pino.destination()


class bulbController {

    constructor(socket, controlnsp, dashnsp, logger, current_gaze_pattern, current_feedback) {
        this.nsp = socket.nsp;
        this.socket = socket;
        this.controlnsp = controlnsp;
        this.dashnsp = dashnsp;
        this.state_machine = 0;
        this.counter = 0;
        this.max_trigger = 4;
        this.cooldown = 2000;
        this.t_cooldown = Date.now()
        this.timeout_counter = 0;
        this.pattern;
        this.logger = logger;
        this.feedbackType = current_feedback;
        this.processing = false;
        this.last_pitch = 0;
        this.last_yaw = 0;
        this.lightOn = false;
        this.fsensitivity = 20;
        this.gsensitivity = 10;
        this.lightRing = new lightRing(100, 50, 25);
        this.average_face = { face_yaw: 0, face_pitch: 0, pitch: 0, yaw: 0 };
        this.timeout_pointer = setTimeout(this.nextFrame.bind(this), this.cooldown);
         // timout pointer identifier
        

        //Calibration Options. 5 Frames at the moment.
        this.calibrating = false;
        this.calibrationCount = 0;
        this.calibrationLimit = 6;

        //This prefixes all the logs made by this camera with the cameraname
       // logger.info("Testing");
        this.log = logger.child({ camera: this.nsp.name });
        //console.log(this.log);
        this.setPattern(current_gaze_pattern);

        this.socket.on("face", this.nextFrame.bind(this)); 
   
        this.bulbController = this;
    }

    setPattern(gaze_pattern) {
        this.log.info("Updating pattern to " + gaze_pattern);
        this.pattern = gaze_pattern.split(" ");
        console.log("pattern length "+this.pattern.length);
        this.state_machine = 0;
        this.t_cooldown = Date.now()
    }

    setAverageFace(avgFace) {
        this.average_face = avgFace;
        this.log.info('Average face set');
    }

    setSensitivity(newSensitivity){
        this.sensitivity = newSensitivity;
    }

    compare_numbers_linear(_compare, average, _sum) {
        var low_n = average - _sum;
        var high_n = average + _sum;

        if ((low_n <= _compare) && (high_n >= _compare)) {
            return (true);
        } else {
            return (false);
        }
    }

    logSomething(logLine){
        this.log.info(logLine);
    }

    startCalibrate() {
        this.nsp.emit('bulb', '{"command":"calibrate"}');
        console.log("sending {\"command\":\"calibrate\"}");
        this.average_face = { face_yaw: 0, face_pitch: 0, pitch: 0, yaw: 0 };
        this.calibrating = true;
        this.calibrationCount = 0;
    }

    setState(newLight) {
        //if (newLight != this.lightOn) {
            this.lightOn=newLight;
            console.log('Toggling LED Bulb'+this.lightOn);
            this.nsp.emit('bulb', '{"command":"status", "status":"'+this.lightOn+'"}');
            this.log.info('Toggling LED Bulb'+this.lightOn);
        //}
    }

    sendRing() {
        this.nsp.emit('bulb', '{"command":"ring", ' + this.lightRing.toString() + '}');
    }

    async updateFeedback() {
        //Called when state changes to update the light ring
        if (this.calibrating) {
            var baseCol = [0, 0, 0];
            var acol = [20, 20, 20];
            var gcol = [0, 30, 0];

            if (this.calibrationCount == 0) {
                this.lightRing.setAll(baseCol[0], baseCol[1], baseCol[2]);
            } else if (this.calibrationCount == this.calibrationLimit) {
                this.lightRing.setAll(gcol[0], gcol[1], gcol[2]);
            } else {
                var fill_level = this.calibrationCount * Math.abs(this.lightRing.no_lights / this.calibrationLimit);
                this.lightRing.setRange(0, fill_level, gcol[0], gcol[1], gcol[2]);
                this.lightRing.setRange(fill_level, this.lightRing.no_lights, acol[0], acol[1], acol[2]);
            }
            this.sendRing();
            return;
        }

        //Add new feedback behaviours as options in the case statement below
        switch (this.feedbackType) {
            case "rotate":
                var baseCol = [0, 0, 0];
                var interactColA = [20, 20, 20];
                var interactColG = [0, 30, 0];
                var warnColA = [10, 10, 0];
                var warnColG = [0, 15, 0];

                //2 stage timeout colour change.
                var acol = (this.timeout_counter>0)?warnColA:interactColA;
                var gcol = (this.timeout_counter>0)?warnColG:interactColG;

                if (this.state_machine == 0) {
                    this.lightRing.setAll(baseCol[0], baseCol[1], baseCol[2]);
                } else if (this.state_machine == this.pattern.length) {
                    this.lightRing.setAll(gcol[0], gcol[1], gcol[2]);
                } else {
                    var fill_level = this.state_machine * Math.abs(this.lightRing.no_lights / this.pattern.length);
                    this.lightRing.setRange(0, fill_level, gcol[0], gcol[1], gcol[2]);
                    this.lightRing.setRange(fill_level, this.lightRing.no_lights, acol[0], acol[1], acol[2]);
                }
                break;
            case "followMe":
                var baseCol = [0, 0, 0];
                var interactColA = [20, 20, 20];
                var interactColG = [0, 30, 0];
                var warnColA = [10, 10, 0];
                var warnColG = [0, 15, 0];

                //2 stage timeout colour change.
                var acol = (this.timeout_counter>0)?warnColA:interactColA;
                var gcol = (this.timeout_counter>0)?warnColG:interactColG;

                if (this.state_machine == 0) {
                    //All off
                    this.lightRing.setAll(baseCol[0], baseCol[1], baseCol[2]);
                } else if (this.state_machine == this.pattern.length) {
                    //All Green
                    this.lightRing.setAll(gcol[0], gcol[1], gcol[2]);
                } else {
                    
                    //Show the next way to look -- this is very ineficient but whatever
                    switch (this.pattern[this.state_machine]){
                        case "up":
                            this.lightRing.setRange(0, 4, gcol[0], gcol[1], gcol[2]);
                            this.lightRing.setRange(5, 6, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(7, 11, gcol[0], gcol[1], gcol[2]);
                            break;
                        case "down":
                            this.lightRing.setRange(0, 0, gcol[0], gcol[1], gcol[2]);
                            this.lightRing.setRange(1, 10, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(11, 11, acol[0], acol[1], acol[2]);
                            break;
                        case "center":
                            this.lightRing.setRange(0, 0, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(1, 2, gcol[0], gcol[1], gcol[2]);
                            this.lightRing.setRange(3, 3, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(4, 5, gcol[0], gcol[1], gcol[2]);
                            this.lightRing.setRange(6, 6, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(7, 8, gcol[0], gcol[1], gcol[2]);
                            this.lightRing.setRange(9, 9, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(10, 11, gcol[0], gcol[1], gcol[2]);
                            break;
                        case "left":
                   
                            this.lightRing.setRange(0, 2, gcol[0], gcol[1], gcol[2]);
                            this.lightRing.setRange(3, 4, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(5, 11, gcol[0], gcol[1], gcol[2]);
                            break;
                        case "right":
                   
                            this.lightRing.setRange(0, 7, gcol[0], gcol[1], gcol[2]);
                            this.lightRing.setRange(8, 9, acol[0], acol[1], acol[2]);
                            this.lightRing.setRange(10, 11, gcol[0], gcol[1], gcol[2]);
                            break;
                    }
                }
                break;

        }
        this.sendRing();
    }

    async statusHandler(json_data) {
        console.log(json_data);
        var payload = JSON.parse(json_data);
        console.log(payload['command']);
        switch (payload['command']) {
            case "status":
                //Update the object and send to dashboard
                this.lightOn = parseInt(payload['light']) == 0 ? false : true;
                this.dashnsp.emit('bulb', '{"bulb":"'+ this.nsp.name + '", "status":"' + this.lightOn.toString() + '"}');
                break;
        }
    }

    
    async nextFrame(rawface) {
        //Process a face
        //console.log(rawface);
        //this.logSomething("do you work?");
       // this.log.info('strange test');
        if(rawface == null || typeof rawface === 'undefined'){
            //then this is a timeout callback
            if(this.timeout_counter == 0){
                //first timeout so make it warning
                this.timeout_counter++;
                clearTimeout(this.timeout_pointer);
                this.timeout_pointer = setTimeout(this.nextFrame.bind(this), this.cooldown);
                this.updateFeedback(); //it knows what to do with timeout_counter
            }else{
                console.log('timeout ' + this.nsp.name);
                this.t_cooldown = Date.now();
                this.log.info('TIMEOUT');
                this.state_machine = 0;
                this.timeout_counter = 0;
                this.updateFeedback();
            }
            return;
        }


        

        if (this.processing) {
            return;
        } else {
            this.processing = true;
        }

        //Cancel and reset the callback to fire timeout when nobody is watching. 
        clearTimeout(this.timeout_pointer);
        this.timeout_pointer = setTimeout(this.nextFrame.bind(this), this.cooldown);
        this.timeout_counter = 0;

        if (this.calibrating) {
            face = JSON.parse(rawface)["face"][0];
            //make the average face 
            this.average_face.pitch = this.average_face.pitch + face["gaze"]["pitch"];
            this.average_face.yaw = this.average_face.yaw + face["gaze"]["yaw"];
            this.average_face.face_pitch = this.average_face.face_pitch + face["direction"]["pitch"];
            this.average_face.face_yaw = this.average_face.face_yaw + face["direction"]["yaw"];
            this.calibrationCount++;
            if (this.calibrationCount < this.calibrationLimit) {
                console.log("calibration frame "+this.calibrationCount);
                this.updateFeedback();
            } else {
                this.lightRing.setAll(0, 0, 0);
                this.calibrating = false;
                this.average_face.pitch = this.average_face.pitch / this.calibrationLimit;
                this.average_face.yaw = this.average_face.yaw  / this.calibrationLimit;
                this.average_face.face_pitch = this.average_face.face_pitch  / this.calibrationLimit;
                this.average_face.face_yaw = this.average_face.face_yaw  / this.calibrationLimit;
                this.log.info('Calibration Finished');
                this.dashnsp.emit('bulb', '{"command":"calibrationComplete", "bulb":"'+this.nsp.name +'"}');
            }
            this.processing = false;
            return;
        }

        if (this.pattern != null && this.pattern.length == 0) {
            //not initalised with an interaction pattern, so do nothing
            //Might be depreciated, can use it to turn off interaction though.
            this.processing = false;
            return;
        }

        //GET THE FACE OUT OF THE RAW DATA
        var good = false;
        try{
            var face = JSON.parse(rawface)["face"][0];
            good=true;
        } catch (error) {
            console.error(rawface);
        }
        if(good){
        let old_machine = this.state_machine;
        console.log(face["face"]);
        console.log(face["gaze"]);
        console.log(face["direction"]);
        //console.log(face["face"][0]["gaze"]);
        //console.log(face["face"][0]["direction"]);
        console.log("Timeout Debug " + Date.now() + " " + this.t_cooldown + " " + (Date.now() - this.t_cooldown) + " " +  this.cooldown);


        if ((Date.now() - this.t_cooldown) < this.cooldown) {
            var yaw = face["gaze"]["yaw"];
            var pitch = face["gaze"]["pitch"];
            var pos_x = face["face"]["x"];
            var pos_y = face["face"]["y"];
            var face_size = face["face"]["size"];
            var face_pitch = face["direction"]["pitch"];
            var face_yaw = face["direction"]["yaw"];

            if (this.state_machine == 0) {
                this.last_pitch = this.average_face.pitch;
                this.last_yaw = this.average_face.yaw;
            }

            

            console.log("State: " + this.state_machine + " at " + this.pattern[this.state_machine]);
            console.log(" Fyaw " + face_yaw + " Fptich " + this.average_face.face_yaw + " yaw " + yaw + " pitch " + pitch );
            console.log("Calibtate: " + this.average_face.face_yaw + " " +this.average_face.face_pitch + " GAZE " + this.average_face.yaw + " " + this.average_face.pitch);

            switch (this.pattern[this.state_machine]) {
                case "up":
                    if ((this.compare_numbers_linear(face_yaw, this.average_face.face_yaw, this.fsensitivity)) && (this.compare_numbers_linear(face_pitch, this.average_face.face_pitch, this.fsensitivity))) {
                        if (pitch > (this.last_pitch + this.gsensitivity)) {
                            this.state_machine++;
                            this.t_cooldown = Date.now(); //got a good look, reset cooldown
                            console.log('Moving to state machine in state number ' + this.state_machine);
                            this.log.info('UP, moving to ' + this.state_machine);
                        }
                    } else {
                        this.state_machine = 0;
                        this.log.info('UP, moving to ' + this.state_machine);
                        console.log('state machine reset to 0 for face missalignment');
                    }
                    break;
                case "down":
                    if ((this.compare_numbers_linear(face_yaw, this.average_face.face_yaw, this.fsensitivity)) && (this.compare_numbers_linear(face_pitch, this.average_face.face_pitch, this.fsensitivity))) {
                        if (pitch < (this.last_pitch - this.gsensitivity)) {
                            this.state_machine++;
                            this.log.info('DOWN, moving to ' + this.state_machine);
                            this.t_cooldown = Date.now(); //got a good look, reset cooldown
                            console.log('Moving to state machine in state number ' + this.state_machine);
                        }
                    } else {
                        this.state_machine = 0;
                        this.log.info('DOWN, moving to ' + this.state_machine);
                        console.log('state machine reset to 0 for face missalignment');
                    }
                    break;
                case "center":
                    if ((this.compare_numbers_linear(face_yaw, this.average_face.face_yaw, this.fsensitivity)) && (this.compare_numbers_linear(face_pitch, this.average_face.face_pitch, this.fsensitivity))) {
                        if ((this.compare_numbers_linear(yaw, this.average_face.yaw, this.gsensitivity)) && (this.compare_numbers_linear(pitch, this.average_face.pitch, this.gsensitivity))) {
                            this.state_machine++;
                            this.log.info('CENTER, moving to ' + this.state_machine);
                            this.t_cooldown = Date.now(); //got a good look, reset cooldown
                            console.log('Moving to state machine in state number ' + this.state_machine);
                            this.last_pitch = this.average_face.pitch;
                            this.last_yaw = this.average_face.yaw;
                        }
                    } else {
                        this.state_machine = 0;
                        this.log.info('CENTER, moving to ' + this.state_machine);
                        console.log('state machine reset to 0 for face missalignment');
                    }
                    break;
                case "left":
                    if ((this.compare_numbers_linear(face_yaw, this.average_face.face_yaw, this.fsensitivity)) && (this.compare_numbers_linear(face_pitch, this.average_face.face_pitch, this.fsensitivity))) {
                        if (yaw > (this.last_yaw + this.gsensitivity)) {
                            this.state_machine++;
                            this.log.info('LEFT, moving to ' + this.state_machine);
                            this.t_cooldown = Date.now(); //got a good look, reset cooldown
                            console.log('Moving to state machine in state number ' + this.state_machine);
                        }
                    } else {
                        this.state_machine = 0;
                        this.log.info('LEFT, moving to ' + this.state_machine);
                        console.log('state machine reset to 0 for face missalignment');
                    }
                    break;
                case "right":
                    if ((this.compare_numbers_linear(face_yaw, this.average_face.face_yaw, this.fsensitivity)) && (this.compare_numbers_linear(face_pitch, this.average_face.face_pitch, this.fsensitivity))) {
                        if (yaw < (this.last_yaw - this.gsensitivity)) {
                            this.state_machine++;
                            this.log.info('RIGHT, moving to ' + this.state_machine);
                            this.t_cooldown = Date.now(); //got a good look, reset cooldown
                            console.log('Moving to state machine in state number ' + this.state_machine);
                        }
                    } else {
                        this.state_machine = 0;
                        this.log.info('RIGHT, moving to ' + this.state_machine);
                        console.log('state machine reset to 0 for face missalignment');
                    }
                    break;
                default:
                    console.log('Command not found in gestures ' + this.pattern[this.state_machine]);
            }

            //this.nsp.emit('progress', "{x:'" + this.state_machine + "', outof:'" + this.pattern.length + "'}");
            this.log.info('PROGRESS, x:' + this.state_machine + " outof: " + this.pattern.length);
            this.updateFeedback();

            if (this.state_machine == 1) this.nsp.emit('interaction starts'); //not sure this one is needed?
            if (this.state_machine == this.pattern.length) {
                this.state_machine = 0;
                console.log('interaction complete');
                this.log.info('INTERACTION SUCCESS');
                this.t_cooldown = Date.now();
                //this.nsp.emit('interaction complete'); //bulb should do something when it gets this.
                this.setState(!this.lightOn);
                this.log.info('Toggling LED Bulb');
            }


            this.processing = false;
        } else {
            console.log('timeout ' + this.nsp.name);
            this.t_cooldown = Date.now();
            this.log.info('TIMEOUT');
            this.state_machine = 0;
            this.updateFeedback();
            
        }

        if(old_machine != this.state_machine){
            //Send the new progress to the dashboard
            this.dashnsp.emit('game', "{x:'" + this.state_machine + "', outof:'" + this.pattern.length + "'}");
        }
    }
        this.processing = false;
    }
}



module.exports = bulbController;
