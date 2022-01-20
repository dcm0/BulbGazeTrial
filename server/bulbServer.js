

const app = require('express');
const { runInThisContext } = require('vm');
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
  }
});



//Bulb Controller object 

class bulbController {

  constructor(namespace) {
    this.nsp = namespace;
    this.stateMachine = 0;
    this.counter = 0;
    this.max_trigger = 4;
    this.cooldown = 2000;
    this.t_cooldown = Date.now()
    this.pattern;
    this.processing = false;
    this.last_pitch = 0;
    this.last_yaw = 0;

    this.nsp.on("face", this.nextFrame); //no 100% sure on this one...

  }

  setPattern(gaze_pattern) {
    console.log("Updating pattern on " + this.nsp.name + " to " + gaze_pattern);
    this.pattern = gaze_pattern.split(" ");
  }

  setAverageFace(avgFace) {
    this.average_face = avgFace;
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

  async nextFrame(rawface) {

    if (this.processing) {
      return;
    } else {
      this.processing = true;
    }

    if (this.pattern.length == 0) {
      //not initalised with an interaction pattern, so do nothing
      return;
    }

    //GET THE FACE OUT OF THE RAW DATA (JSON OR WHAT?)
    face = rawface;

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
              //progressBarUpdate(this.state_machine, this.pattern.length);
            }
          } else {
            this.state_machine = 0;
            console.log('state machine resetet to 0 fro face missalignment');
          }
          break;
        case "down":
          if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
            if (pitch < (this.last_pitch - percentage)) {
              this.state_machine++;
              this.t_cooldown = Date.now(); //got a good look, reset cooldown
              console.log('Moving to state machine in state number ' + this.state_machine);
              progressBarUpdate(this.state_machine, this.pattern.length);
            }
          } else {
            this.state_machine = 0;
            console.log('state machine resetet to 0 fro face missalignment');
          }
          break;
        case "center":
          if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
            if ((compare_numbers_linear(face_yaw, this.average_face.yaw, percentage)) && (compare_numbers_linear(face_pitch, this.average_face.pitch, percentage))) {
              this.state_machine++;
              this.t_cooldown = Date.now(); //got a good look, reset cooldown
              console.log('Moving to state machine in state number ' + this.state_machine);
              progressBarUpdate(this.state_machine, this.pattern.length);
              this.last_pitch = this.average_face.pitch;
              this.last_yaw = this.average_face.yaw;
            }
          } else {
            this.state_machine = 0;
            console.log('state machine resetet to 0 fro face missalignment');
          }
          break;
        case "left":
          if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
            if (yaw > (this.last_yaw + percentage)) {
              this.state_machine++;
              this.t_cooldown = Date.now(); //got a good look, reset cooldown
              console.log('Moving to state machine in state number ' + this.state_machine);
              progressBarUpdate(this.state_machine, this.pattern.length);
            }
          } else {
            this.state_machine = 0;
            console.log('state machine resetet to 0 fro face missalignment');
          }
          break;
        case "right":
          if ((compare_numbers_linear(face_yaw, this.average_face.face_yaw, percentage + 10)) && (compare_numbers_linear(face_pitch, this.average_face.face_pitch, percentage + 10))) {
            if (yaw < (this.last_yaw - percentage)) {
              this.state_machine++;
              this.t_cooldown = Date.now(); //got a good look, reset cooldown
              console.log('Moving to state machine in state number ' + this.state_machine);
              progressBarUpdate(this.state_machine, this.pattern.length);
            }
          } else {
            this.state_machine = 0;
            console.log('state machine resetet to 0 fro face missalignment');
          }
          break;
        default:
          console.log('Command not found in gestures ' + this.pattern[this.state_machine]);
      }

      this.nsp.emit('progress', "{x:'" + this.state_machine + "', outof:'" + this.pattern.length + "'}");
      if (this.state_machine == 1) this.nsp.emit('interaction starts'); //not sure this one is needed?
      if (this.state_machine == this.pattern.length) {
        this.state_machine = 0;
        console.log('interaction complete');
        this.t_cooldown = Date.now();
        this.nsp.emit('interaction complete'); //bulb should do something when it gets this.
      }


      this.processing = false;
    }else{
      console.log('timeout');
      this.state_machine=0;
      this.nsp.emit('progress', "{x:'" + this.state_machine + "', outof:'" + this.pattern.length + "'}");
   } 

  }
}



var bulbControllers = [];


var cnsp = io.of('/controller');
cnsp.on('connection', function (socket) {
  console.log('controller connected');
  cnsp.emit('bulb', 'Hello controller');
});

var dnsp = io.of('/dashboard');
dnsp.on('connection', function (socket) {
  console.log('dash connected');
  dnsp.emit('bulb', 'Hello dash!');
});

var cameras = io.of(/^\/camera-\d+$/);
cameras.on("connection", (socket) => {
  console.log('bulb connected');
  bulbControllers.push(new bulbController(socket.nsp));
  cameras.emit('bulb', 'Hello camera ' + socket.nsp.name);


});

// io.on('connection', (socket) => {

//   console.log('Connected');
//   console.log(socket.id);
//   console.log("JWT token test: ",socket.handshake.headers)

//   socket.on('event_name', (data) => {

//     console.log("Message from Client : ", data);

//     socket.broadcast.emit("Send Message socket.broadcast.emit : ", data);
//     io.emit("Send Message io.emit Broadcasted : ", data);
//     socket.emit("Send Message : ", data);

//   })

//   socket.on('disconnect', () => {

//     console.log('Disconnected');

//   })

// })

http.listen(8080, () => {

  console.log("Server launched on port 8080");
})


