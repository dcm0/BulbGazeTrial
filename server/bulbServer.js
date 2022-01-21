

const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const app = require('express');
const { runInThisContext } = require('vm');
const logger = require('pino')('./bulbLogs.log'); //pino.destination()
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
  }
});

//Status Variables
var last_differences = 2;
var current_target;
var round_counter = 0;
var current_gaze_pattern = "center up left";



//Bulb Controller object
class bulbController {

  constructor(socket, controlnsp, dashnsp) {
    this.nsp = socket.namespace;
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

    this.socket.on("face", this.nextFrame); //no 100% sure on this one...
    this.socket.on('bulb', this.statusHandler);

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

  setState(newLight) {
    if (newLight != this.lightOn) {
      this.nsp.emit('bulb', "{command:'toggle'}");
    }
  }

  async statusHandler(json_data) {

    payload = JSON.parse(json_data);
    switch (payload['command']) {
      case "status":
        //Update the object and send to dashboard
        this.lightOn = parseInt(payload['light']) == 0 ? false : true;
        this.dashnsp.emit('bulb', "{bulb:'" + this.nsp.name + "', status:'" + this.lightOn.toString() + "'}");
        break;
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

    //GET THE FACE OUT OF THE RAW DATA
    face = JSON.parse(rawface)[0];

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



var bulbControllers = [];

//Connect everything up
var cnsp = io.of('/controller');
cnsp.on('connection', function (socket) {
  console.log('controller connected');
  logger.info('controller connected');
  cnsp.emit('bulb', 'Hello controller');
//Controller Event handlers
socket.on('game', (json_data) => {
  console.log('cnsp');
payload = JSON.parse(json_data);
switch (payload['command']) {
  case "check":
    //check if the pattern matches
    if(checkQuiz()){
      logger.info('CONTROLLER CHECK - Pass');
      cnsp.emit('game', "{command:'passCheck'");
    }else{
      logger.info('CONTROLLER CHECK - Fail');
      cnsp.emit('game', "{command:'failCheck'");
    }
    break;
  case "skip":
    logger.info('CONTROLLER SKIP');
    cnsp.emit('game', "{command:'skipInitiated'");
    //record this as a cancel/skip
    setupNewQuiz();
    break;
  case "start_timer":
    logger.info('ROUND STARTED');
    break;
  case "next":
    logger.info('CONTROLLER NEXT');
    cnsp.emit('game', "{command:'nextInitiated'");
    //record this as a cancel/skip   
    setupNewQuiz();
    break;


}

});

});

var dnsp = io.of('/dashboard');
dnsp.on('connection', function (socket) {
  console.log('dash connected');
  logger.info('Dashboard connected');
  dnsp.emit('bulb', 'Hello dash!');

  socket.on('game', (json_data) => {
    console.log('dnsp');
  payload = JSON.parse(json_data);
  switch (payload['command']) {
    case "skip":
      logger.info('DASHBOARD SKIP');
      //record this as a cancel/skip and notify to start the waiting screen on controller
      cnsp.emit('game', "{command:'passCheck'");
      //then just do the new pattern command below
    case "newQuiz":
      console.log('DASHBOARD New Quiz');
      logger.info('DASHBOARD New Quiz');
      setupNewQuiz(payload['differences']);
      break;
    case "setInteraction":
      for (let index = 0; index < bulbControllers.length; index++) {
        bulbControllers[index].setPattern(payload['interaction_pattern']);
      }
      logger.info('Interaction Changed ' + payload['interaction_pattern']);
      break;
    case "resetCounter":
      round_counter=0;
      break;
    case "logString":
      //Figure we might want to send participant ID to the logs or something
      logger.info(payload['logString']);
  }

});


});

var cameras = io.of(/^\/camera-\d+$/);
cameras.on("connection", (socket) => {
  console.log('bulb connected');
  bulbControllers.push(new bulbController(socket, cnsp, dnsp));
  //What is the Average Face stuff? Where do I get that?
  logger.info('Bulb connected ' + socket.nsp.name);
  cameras.emit('bulb', 'Hello camera ' + socket.nsp.name);
});

//Dashboard Event handlers
// dnsp.on('game', (json_data) => {
//     console.log('dnsp');
//   payload = JSON.parse(json_data);
//   switch (payload['command']) {
//     case "skip":
//       logger.info('DASHBOARD SKIP');
//       //record this as a cancel/skip and notify to start the waiting screen on controller
//       cnsp.emit('game', "{command:'passCheck'");
//       //then just do the new pattern command below
//     case "newQuiz":
//       console.log('DASHBOARD New Quiz');
//       logger.info('DASHBOARD New Quiz');
//       setupNewQuiz(payload['differences']);
//       break;
//     case "setInteraction":
//       for (let index = 0; index < bulbControllers.length; index++) {
//         bulbControllers[index].setPattern(payload['interaction_pattern']);
//       }
//       logger.info('Interaction Changed ' + payload['interaction_pattern']);
//       break;
//     case "resetCounter":
//       round_counter=0;
//       break;
//     case "logString":
//       //Figure we might want to send participant ID to the logs or something
//       logger.info(payload['logString']);
//   }

// });

// //Controller Event handlers
// cnsp.on('game', (json_data) => {
//     console.log('cnsp');
//   payload = JSON.parse(json_data);
//   switch (payload['command']) {
//     case "check":
//       //check if the pattern matches
//       if(checkQuiz()){
//         logger.info('CONTROLLER CHECK - Pass');
//         cnsp.emit('game', "{command:'passCheck'");
//       }else{
//         logger.info('CONTROLLER CHECK - Fail');
//         cnsp.emit('game', "{command:'failCheck'");
//       }
//       break;
//     case "skip":
//       logger.info('CONTROLLER SKIP');
//       cnsp.emit('game', "{command:'skipInitiated'");
//       //record this as a cancel/skip
//       setupNewQuiz();
//       break;
//     case "start_timer":
//       logger.info('ROUND STARTED');
//       break;
//     case "next":
//       logger.info('CONTROLLER NEXT');
//       cnsp.emit('game', "{command:'nextInitiated'");
//       //record this as a cancel/skip   
//       setupNewQuiz();
//       break;


//   }

// });


function checkQuiz(){

  correct = true;
  for (let index = 0; index < bulbControllers.length; index++) {
    if(bulbControllers[index].lightOn != target_pattern[index]){
      correct = false;
    }
  }
  return false;

}


function setupNewQuiz(differences = last_differences) {

  //randomise status of lights.
  //store as target
  //change the correct number of lights
  //set as current status

  last_differences = differences;

  var target_pattern = new Array(bulbControllers.length).fill(false);
  for (let idx = 0; idx < target_pattern.length; idx++) {
    target_pattern[idx] = Math.random() < 0.5;
  }

  var start_pattern = target_pattern;

  if (differences > bulbControllers.length) {
    differences = bulbControllers.length;
  }

  while (change_indexes.length < differences) {
    var random_number = Math.floor(Math.random() * (bulbControllers.length));
    if (change_indexes.indexOf(random_number) == -1) {
      // Yay! new random number
      change_indexes.push(random_number);
    }

    for (let i = 0; i < change_indexes.length; i++) {
      //toggle the change ones
      start_pattern[change_indexes[i]] = !start_pattern[change_indexes[i]]
    }

    current_target = target_pattern;

    for (let index = 0; index < bulbControllers.length; index++) {
      bulbControllers[index].setState(start_pattern[index]);
    }
    round_counter++;
    var target_json = "{command:'newQuiz', round:'"+round_counter+"', target_pattern:"+JSON.stringify(target_pattern)+", gaze_pattern:'"+current_gaze_pattern+"'}";
    console.log(target_json);
    dnsp.emit('game', target_json);
    cnsp.emit('game', target_json);
    logger.info('Starting new round ('+round_counter+") differences:"+differences+" elements to change:"+JSON.stringify(change_indexes));

  }
}



http.listen(8080, () => {

  console.log("Server launched on port 8080");
})
