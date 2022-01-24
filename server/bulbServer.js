

const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const app = require('express');
const { runInThisContext } = require('vm');
const logger = require('pino')('./bulbLogs.log'); //pino.destination()
const bulbController = require('./bulbController');
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
console.log(json_data);
console.log(payload['command']);
switch (payload['command']) {
  case "check":
    //check if the pattern matches
    if(checkQuiz()){
      logger.info('CONTROLLER CHECK - Pass');
      cnsp.emit('game', '{"command":"passCheck"}');
    }else{
      logger.info('CONTROLLER CHECK - Fail');
      cnsp.emit('game', '{"command":"failCheck"}');
    }
    break;
  case "skip":
    logger.info('CONTROLLER SKIP');
    cnsp.emit('game', '{"command":"skipInitiated"}');
    //record this as a cancel/skip
    setupNewQuiz();
    break;
  case "start_timer":
    logger.info('ROUND STARTED');
    break;
  case "next":
    logger.info('CONTROLLER NEXT');
    cnsp.emit('game', '{"command":"nextInitiated"}');
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
      cnsp.emit('game', '{"command":"passCheck"}');
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
      break;
    case "calibrate":
      var cam = payload['camString'];
      console.log(cam);
      bulbControllers.forEach(bulb => {
        console.log("tostrgin: "+bulb.nsp.name.toString());
        if(bulb.nsp.name.toString().includes(cam)){
          console.log(bulb.nsp.name.toString());
          bulb.startCalibrate();
        }  
      });
      break;
    case "toggleCamera":
      var cam = payload['camString'];
      var light = payload['status'];
      
      bulbControllers.forEach(bulb => {
        console.log(bulb.nsp.name.toString());
        if(bulb.nsp.name.toString().includes(cam)){
          console.log(bulb.nsp.name.toString());
          bulb.setState(light=='off'?false:true);
          bulb.sendRing(lightArray);
        }  
      });
      break;
  }

});


});

var cameras = io.of(/^\/camera-\d+$/);
cameras.on("connection", (socket) => {
  console.log('bulb connected');
  bulbControllers.push(new bulbController(socket, cnsp, dnsp, logger));
  //What is the Average Face stuff? Where do I get that?
  logger.info('Bulb connected ' + socket.nsp.name);
  cameras.emit('bulb', 'Hello camera ' + socket.nsp.name);
});


function checkQuiz(){

  correct = true;
  for (let index = 0; index < bulbControllers.length; index++) {
    if(bulbControllers[index].lightOn != target_pattern[index]){
      correct = false;
    }
  }
  return correct;

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

  var change_indexes = new Array(0);

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
      bulbControllers[index].setPattern(start_pattern[index]);
    }
    round_counter++;
    var target_json = '{"command":"newQuiz", "round":"'+round_counter+'", "target_pattern":"'+JSON.stringify(target_pattern)+'", "gaze_pattern":"'+current_gaze_pattern+'"}';
    console.log(target_json);
    dnsp.emit('game', target_json);
    cnsp.emit('game', target_json);
    logger.info('Starting new round ('+round_counter+") differences:"+differences+" elements to change:"+JSON.stringify(change_indexes));

  }
}



http.listen(8080, () => {

  console.log("Server launched on port 8080");
})
