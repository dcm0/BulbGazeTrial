//Bulb Controller object
const e = require('express');
const lightRing = require('./lightRing');
//const logger = require('pino')('./bulbLogs.log'); //pino.destination()


class bulbController {

    constructor(socket, controlnsp, dashnsp, logger, current_gaze_pattern, current_feedback) {
        this.nsp = socket.nsp;
        this.socket = socket;
        this.controlnsp = controlnsp;
        this.dashnsp = dashnsp;
        this.stateMachine = 0;
        this.counter = 0;
        this.max_trigger = 4;
        this.cooldown = 2000;
        this.t_cooldown = Date.now()
        this.pattern;
        this.logger = logger;
        this.feedbackType = current_feedback;
        this.processing = false;
        this.last_pitch = 0;
        this.last_yaw = 0;
        this.lightOn = false;
        this.lightRing = new lightRing(100, 50, 25);

        //Calibration Options. 5 Frames at the moment.
        this.calibrating = false;
        this.calibrationCount = 0;
        this.calibrationLimit = 6;

        //This prefixes all the logs made by this camera with the cameraname
        logger.info("Testing");
        this.log = logger.child({ camera: this.nsp.name });
        console.log(this.log);
        this.setPattern(current_gaze_pattern);

        this.socket.on("face", this.nextFrame); 
        this.socket.on('bulb', this.statusHandler);

    }

    setPattern(gaze_pattern) {
        this.log.info("Updating pattern to " + gaze_pattern);
        this.pattern = gaze_pattern.split(" ");
        console.log("pattern length "+this.pattern.length);
        this.stateMachine = 0;
        this.t_cooldown = Date.now()
    }

    setAverageFace(avgFace) {
        this.average_face = avgFace;
        this.log.info('Average face set');
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
            var acol = [120, 120, 120];
            var gcol = [0, 230, 0];

            if (this.calibrationCount == 0) {
                this.lightRing.setAll(baseCol[0], baseCol[1], baseCol[2]);
            } else if (this.calibrationCount == this.calibrationLimit) {
                this.lightRing.setAll(gcol[0], gcol[1], gcol[2]);
            } else {
                var fill_level = this.calibrationCount * abs(this.lightRing.no_lights / this.calibrationLimit);
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
                var acol = [120, 120, 120];
                var gcol = [0, 230, 0];

                if (this.state_machine == 0) {
                    this.lightRing.setAll(baseCol[0], baseCol[1], baseCol[2]);
                } else if (this.state_machine == this.patern.length) {
                    this.lightRing.setAll(gcol[0], gcol[1], gcol[2]);
                } else {
                    var fill_level = this.state_machine * abs(this.lightRing.no_lights / this.pattern.length);
                    this.lightRing.setRange(0, fill_level, gcol[0], gcol[1], gcol[2]);
                    this.lightRing.setRange(fill_level, this.lightRing.no_lights, acol[0], acol[1], acol[2]);
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

    
    nextFrame(rawface) {
        //Process a face
        //console.log(rawface);
        //this.logSomething("do you work?");
        if (this.processing) {
            return;
        } else {
            this.processing = true;
        }

        if (this.calibrating) {
            face = JSON.parse(rawface);
            //make the average face 
            this.average_face.pitch = this.average_face.pitch + face.pitch;
            this.average_face.yaw = this.average_face.yaw + face.yaw;
            this.average_face.face_pitch = this.average_face.face_pitch + face.face_pitch;
            this.average_face.face_yaw = this.average_face.face_yaw + face.face_yaw;
            this.calibrationCount++;
            if (this.calibrationCount < this.calibrationLimit) {
                console.log("calibration frame "+this.calibrationCount);
                this.updateFeedback();
            } else {
                this.lightRing.setAll(0, 0, 0);
                this.calibrating = false;
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
        var face = JSON.parse(rawface);
        let old_machine = this.stateMachine;

        if ((Date.now() - this.t_cooldown) > this.cooldown) {
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

            var percentage = 10;
           

            switch (this.pattern[this.state_machine]) {
                case "up":
                    if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
                        if (pitch > (this.last_pitch + percentage)) {
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
                    if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
                        if (pitch < (this.last_pitch - percentage)) {
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
                    if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
                        if ((compare_numbers_linear(face_yaw, this.average_face.yaw, percentage)) && (compare_numbers_linear(face_pitch, this.average_face.pitch, percentage))) {
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
                    if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
                        if (yaw > (this.last_yaw + percentage)) {
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
                    if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
                        if (yaw < (this.last_yaw - percentage)) {
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
                this.nsp.emit('bulb', '{"command":"toggle"}');
                this.log.info('Toggling LED Bulb');
            }


            this.processing = false;
        } else {
            console.log('timeout');
            console.log(this.nsp.name);
            console.log(this.log);
            this.log.info('TIMEOUT');
            this.state_machine = 0;
            this.updateFeedback();
            
        }

        if(old_machine != this.state_machine){
            //Send the new progress to the dashboard
            this.dashnsp.emit('game', "{x:'" + this.state_machine + "', outof:'" + this.pattern.length + "'}");
        }
        this.processing = false;
    }
}



module.exports = bulbController;
