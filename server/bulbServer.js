

const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const app = require('express');
const { runInThisContext } = require('vm');
const logger = require('pino')('./bulbLogs.log'); //pino.destination()
const bulbController = require('./bulbController');
const lightRing = require('./lightRing');
const fs = require('fs');
const http = require('http').createServer(app);
const Path = require('path');
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
  }
});

//Status Variables
var last_differences = 2;
var current_target;
var round_counter = 0;
var condition_counter = 0;
var current_gaze_pattern = "center center center center";
var current_feedback = "followMe";
var current_gestures = [];

var bulbControllers = [];


async function checkFileExists(file) {
  
  var result = await fs.promises.access(file, fs.constants.F_OK)
  .then(() => true)
  .catch(() => false);
  
  console.log(result);
  
  return result;
}

//Manage list of gestures
const gesturePath = Path.join(__dirname, "gestureList.txt")

if(fs.existsSync(gesturePath)){
  //Then we have a list so read it in
  current_gestures = fs.readFileSync(gesturePath).toString().split("\n");

}else{
  //Make a new file and write out the default?
  let defaultGestures = ['center center center center', 'center center left left', 'center center up up', 'center center down down right right', 'center center right right up up'];
  fs.writeFileSync(gesturePath, defaultGestures.join('\n'), 'utf8');
  current_gestures = defaultGestures;
}




//Connect everything up
/*********GAME CONTROLLER ROUTING***************** */
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
        if (checkQuiz()) {
          logger.info('CONTROLLER CHECK - Pass');
          cnsp.emit('game', '{"command":"passCheck"}');
        } else {
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
/*********END CONTROLLER ROUTING***************** */


/*********DASHBOARD ROUTING*********************** */
var dnsp = io.of('/dashboard');
dnsp.on('connection', function (socket) {
  console.log('dash connected');
  logger.info('Dashboard connected');
  dnsp.emit('bulb', 'Hello dash!');
  sendGestureList();

  socket.on('game', (json_data) => {

    payload = JSON.parse(json_data);
    console.log("Dash Command: " + payload['command']);

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
      case "refreshGestures":
        sendGestureList();
        break;
      case "updateGestureList":
        updateGestureList(payload['gesture_list']);
        break;
      case "setInteraction":
        //Loop each bulb and update the interaction pattern
        //This pattern can be given direct from the Dash
        bulbControllers.forEach(bulb => {
          bulb.setPattern(payload['interaction_pattern']);
        });
        //set default interaction for bulbs that connect later
        current_gaze_pattern = payload['interaction_pattern'];
        logger.info('Interaction Changed ' + payload['interaction_pattern']);
        break;
      case "setFeedback":
        //Loop each bulb and update the feedback pattern
        //Possible patterns must be coded into bulbController
        //currently only 'rotate' is valid.
        bulbControllers.forEach(bulb => {
          logger.info('Feedback Changed ' + payload['feedback_type']);
          bulb.setFeedbackType(payload['feedback_type']);
        });
        //set default feedback for bulbs that connect later
        current_feedback = payload['feedback_type'];
        logger.info('Feedback Changed ' + payload['feedback_type']);
        break;
      case "resetCounter":
        round_counter = 0;
        logger.info('Changed round to 0');
        break;
      case "setRound":
        round_counter = payload['value'];
        logger.info('Changed round to' + payload['value']);
        break;
      case "setCondition":
        condition_counter = payload['value'];
        logger.info('Changed condition to' + payload['value']);
        break;
      case "setSensitivity":
        fSensitivity_value = payload['face'];
        gSensitivity_value = payload['gaze'];
        console.log(fSensitivity_value);
        bulbControllers.forEach(bulb => {
            bulb.setSensitivity(fSensitivity_value, gSensitivity_value);
        });
        break;
      case "setRings":
        bfrom = payload['from'];
        bto = payload['to'];
        r = payload['r'];
        g = payload['g'];
        b = payload['b'];
        //console.log(bfrom + ' ' + bto + ' ' + r + ' ' + g + ' ' + b);
        bulbControllers.forEach(bulb => {
            bulb.lightRing.setRange(bfrom, bto, r, g, b);
            bulb.sendRing();
        });
        break;

      case "logString":
        //Figure we might want to send participant ID to the logs or something
        logger.info(payload['logString']);
        break;
      case "calibrate":
        //Start calibration on certain bulb
        var cam = payload['camString'];
        console.log(cam);
        bulbControllers.forEach(bulb => {
          console.log("tostrgin: " + bulb.nsp.name.toString());
          if (bulb.nsp.name.toString().includes(cam)) {
            console.log(bulb.nsp.name.toString());
            bulb.startCalibrate();
          }
        });
        break;
      case "toggleCamera":
        //Toggle the LED light on and off
        var cam = payload['camString'];
        var light = payload['status'];
        bulbControllers.forEach(bulb => {
          console.log(bulb.nsp.name.toString());
          if (bulb.nsp.name.toString().includes(cam)) {
            console.log(bulb.nsp.name.toString());
            bulb.setState(!bulb.lightOn);

            /***********DEBUG CODE SENDING LIGHT RING VALUES */
            if(!bulb.lightOn){
              bulb.lightRing.setAll(99,0,0);
              bulb.sendRing();
            }else{
              bulb.lightRing.setAll(0,99,0);
              bulb.sendRing();
            }
           
           
            /***********END   CODE SENDING LIGHT RING VALUES */
          }
        });
        break;
    }
  });
});
/*********END DASHBOARD ROUTING*********************** */



/*********GAZEBULB ROUTING*********************** */
var cameras = io.of(/^\/camera-\d+$/);
cameras.on("connection", (socket) => {
  console.log('bulb connected');
  var newBulb = true;

  bulbControllers.forEach(function (bulb, index, bulb_array) {
    if (bulb.nsp.name == socket.nsp.name) {
      //Then we have a reconnection on the same name. Kill and restart?
      newBulb = false;
      //Do I have to disconnect?
      bulb_array[index] = new bulbController(socket, cnsp, dnsp, logger, current_gaze_pattern, current_feedback);
    }
  });
  if (newBulb) {
    bulbControllers.push(new bulbController(socket, cnsp, dnsp, logger, current_gaze_pattern, current_feedback));
  }
  logger.info('Bulb connected ' + socket.nsp.name);
  //Probably shouldn't be sending helo camera anymore?
  cameras.emit('bulb', 'Hello camera ' + socket.nsp.name);
});
/*********END GAZEBULB ROUTING*********************** */



function sendGestureList(){
    
  this.dnsp.emit('game', '{"command":"gestureList", "gestures":"'+JSON.stringify(current_gestures)+'"}');
}


function updateGestureList(newList){

    if(newList.length == current_gestures.length){
      //check if the orders are the same. 
      var dirty = false;
      for (let idx = 0; idx < newList.length; idx++) {
        if (newList[idx] != current_gestures[idx]){
            dirty = true;
        }
      }
      if(!dirty){
        return;
      }
    }

    //Overwrite the file and change the variable
    
    fs.writeFileSync(gesturePath, newList.join('\n'), 'utf8');
    
    current_gestures = newList;
}







/*********QUIZ FUNCTIONS*********************** */

function checkQuiz() {
  //Loop through the boxes and check if the light status
  //matches the target for the round
  console.log('checking quiz');
  correct = true;
  for (let index = 0; index < bulbControllers.length; index++) {
    console.log("Checking Bulb "+ bulbControllers[index].lightOn + " = "+ current_target[index]);
    if (bulbControllers[index].lightOn != current_target[index]) {
      correct = false;
    }
  }
  return correct;
}


function setupNewQuiz(differences = last_differences) {
  last_differences = differences;

  //Get a set of random bools the same number as the boxes
  var target_pattern = new Array(bulbControllers.length).fill(false);
  for (let idx = 0; idx < target_pattern.length; idx++) {
    target_pattern[idx] = Math.random() < 0.5;
  }

  var start_pattern = target_pattern;

  //Make sure we are not making more changes than boxes
  if (differences > bulbControllers.length) {
    differences = bulbControllers.length;
  }

  var change_indexes = new Array(0);

  //Make a random list of unique ints (indexes to change) of length differences
  while (change_indexes.length < differences) {
    var random_number = Math.floor(Math.random() * (bulbControllers.length));
    if (change_indexes.indexOf(random_number) == -1) {
      // Yay! new random number
      change_indexes.push(random_number);
    }
  }

  //toggle those indexes in the start pattern
  for (let i = 0; i < change_indexes.length; i++) {
    //toggle the change ones
    start_pattern[change_indexes[i]] = !start_pattern[change_indexes[i]]
  }

  current_target = target_pattern;

  //then make the bulbs match
  for (let index = 0; index < bulbControllers.length; index++) {
    //Javascript being strange with types
    var bulb = bulbControllers[index];
    bulb.setState(start_pattern[index]==true);
  }

  //Now send this to the game controller (it is hardcoded to 6 bulbs, so make sure that is the same.)
  round_counter++;
  var outputPattern = [false, false, false, false, false, false];
  if (target_pattern.length < outputPattern.length) {
    for (let index = 0; index < target_pattern.length; index++) {
      outputPattern[index] = target_pattern[index];
    }
  } else {
    outputPattern = target_pattern;
  }

  //Now send this out to the dash and the controller, and log it.
  var target_json = '{"command":"newQuiz", "round":"' + round_counter + '", "target_pattern":"' + JSON.stringify(outputPattern) + '", "gaze_pattern":"' + current_gaze_pattern + '"}';
  console.log(target_json);
  dnsp.emit('game', target_json);
  cnsp.emit('game', target_json);
  logger.info('Starting new round (' + round_counter + ") differences:" + differences + " elements to change:" + JSON.stringify(change_indexes));


}



http.listen(8080, () => {

  console.log("Server launched on port 8080");
})
