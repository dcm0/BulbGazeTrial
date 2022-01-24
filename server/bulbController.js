//Bulb Controller object
class bulbController {

    constructor(socket, controlnsp, dashnsp, logger) {
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
      this.processing = false;
      this.last_pitch = 0;
      this.last_yaw = 0;
      this.lightOn = false;
      this.log = logger.child({ camera: this.nsp.name });
      this.calibrating = false;
  
     // this.socket.onAny(this.catchAll);
      this.socket.on("face", this.nextFrame); //no 100% sure on this one...
      this.socket.on('bulb', this.statusHandler);
  
    }
  
    async catchAll(name, item){
      console.log(name);
      console.log(item);
    }
    setPattern(gaze_pattern) {
      this.log.info("Updating pattern on " + this.nsp.name + " to " + gaze_pattern);
      this.pattern = gaze_pattern.split(" ");
      this.stateMachine = 0;
      this.t_cooldown = Date.now()
    }
  
    setAverageFace(avgFace) {
      this.average_face = avgFace;
      this.log.info('set average face');
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

    startCalibrate(){
        this.nsp.emit('bulb', '{"command":"calibrate"}');
        console.log("sending {\"command\":\"calibrate\"}");
        this.average_face = {face_yaw: 0, face_pitch: 0, pitch:0, yaw:0};
        this.calibrating = true;
    }
  
    setState(newLight) {
      if (newLight != this.lightOn) {
        this.nsp.emit('bulb', '{"command":"toggle"}');
      }
    }

    sendRing(lightRingArray){
        var lightString = "";
        for (let index = 0; index < lightRingArray.length; index++) {
            lightString = `${lightString} "${index}": "${lightRingArray[index]['r']},${lightRingArray[index]['g']},${lightRingArray[index]['b']}"`;
        }
        this.nsp.emit('bulb', '{"command":"ring", '+lightString+'}');
    }
  
    async statusHandler(json_data) {
      console.log(json_data);
      var payload = JSON.parse(json_data);
      console.log(payload['command']);
      switch (payload['command']) {
        case "status":
          //Update the object and send to dashboard
          this.lightOn = parseInt(payload['light']) == 0 ? false : true;
          this.dashnsp.emit('bulb', "{bulb:'" + this.nsp.name + "', status:'" + this.lightOn.toString() + "'}");
          break;
        case "calibrationDone":
            this.calibrating = false;
            break;
      }
    }
  
    async nextFrame(rawface) {
      console.log(rawface);
      if (this.processing) {
        return;
      } else {
        this.processing = true;
      }
      console.log("pricessing");
      if(this.calibrating){
        face = JSON.parse(rawface);
        //make the average face 
        this.average_face.pitch = this.average_face.pitch+face.pitch;
        this.average_face.yaw = this.average_face.yaw+face.yaw;
        this.average_face.face_pitch = this.average_face.face_pitch+face.face_pitch;
        this.average_face.face_yaw = this.average_face.face_yaw+face.face_yaw;
      }
  
      if (this.pattern.length == 0) {
        //not initalised with an interaction pattern, so do nothing
        return;
      }
  
      //GET THE FACE OUT OF THE RAW DATA
      face = JSON.parse(rawface);
  
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
                //progressBarUpdate(this.state_machine, this.pattern.length);
              }
            } else {
              this.state_machine = 0;
              this.log.info('UP, moving to ' + this.state_machine);
              console.log('state machine resetet to 0 fro face missalignment');
            }
            break;
          case "down":
            if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
              if (pitch < (this.last_pitch - percentage)) {
                this.state_machine++;
                this.log.info('DOWN, moving to ' + this.state_machine);
                this.t_cooldown = Date.now(); //got a good look, reset cooldown
                console.log('Moving to state machine in state number ' + this.state_machine);
                //progressBarUpdate(this.state_machine, this.pattern.length);
              }
            } else {
              this.state_machine = 0;
              this.log.info('DOWN, moving to ' + this.state_machine);
              console.log('state machine resetet to 0 fro face missalignment');
            }
            break;
          case "center":
            if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
              if ((compare_numbers_linear(face_yaw, this.average_face.yaw, percentage)) && (compare_numbers_linear(face_pitch, this.average_face.pitch, percentage))) {
                this.state_machine++;
                this.log.info('CENTER, moving to ' + this.state_machine);
                this.t_cooldown = Date.now(); //got a good look, reset cooldown
                console.log('Moving to state machine in state number ' + this.state_machine);
                //progressBarUpdate(this.state_machine, this.pattern.length);
                this.last_pitch = this.average_face.pitch;
                this.last_yaw = this.average_face.yaw;
              }
            } else {
              this.state_machine = 0;
              this.log.info('CENTER, moving to ' + this.state_machine);
              console.log('state machine resetet to 0 fro face missalignment');
            }
            break;
          case "left":
            if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
              if (yaw > (this.last_yaw + percentage)) {
                this.state_machine++;
                this.log.info('LEFT, moving to ' + this.state_machine);
                this.t_cooldown = Date.now(); //got a good look, reset cooldown
                console.log('Moving to state machine in state number ' + this.state_machine);
                //progressBarUpdate(this.state_machine, this.pattern.length);
              }
            } else {
              this.state_machine = 0;
              this.log.info('LEFT, moving to ' + this.state_machine);
              console.log('state machine resetet to 0 fro face missalignment');
            }
            break;
          case "right":
            if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
              if (yaw < (this.last_yaw - percentage)) {
                this.state_machine++;
                this.log.info('RIGHT, moving to ' + this.state_machine);
                this.t_cooldown = Date.now(); //got a good look, reset cooldown
                console.log('Moving to state machine in state number ' + this.state_machine);
                //progressBarUpdate(this.state_machine, this.pattern.length);
              }
            } else {
              this.state_machine = 0;
              this.log.info('RIGHT, moving to ' + this.state_machine);
              console.log('state machine resetet to 0 fro face missalignment');
            }
            break;
          default:
            console.log('Command not found in gestures ' + this.pattern[this.state_machine]);
        }
  
        this.nsp.emit('progress', "{x:'" + this.state_machine + "', outof:'" + this.pattern.length + "'}");
        this.log.info('PROGRESS, x:' + this.state_machine + " outof: " + this.pattern.length);
        if (this.state_machine == 1) this.nsp.emit('interaction starts'); //not sure this one is needed?
        if (this.state_machine == this.pattern.length) {
          this.state_machine = 0;
          console.log('interaction complete');
          this.log.info('INTERACTION SUCCESS');
          this.t_cooldown = Date.now();
          this.nsp.emit('interaction complete'); //bulb should do something when it gets this.
        }
  
  
        this.processing = false;
      } else {
        console.log('timeout');
        this.log.info('TIMEOUT');
        this.state_machine = 0;
        this.nsp.emit('progress', "{x:'" + this.state_machine + "', outof:'" + this.pattern.length + "'}");
      }
  
    }
  }

module.exports = bulbController;