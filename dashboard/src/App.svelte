<script>
	import { io } from "socket.io-client";
	import Toggle from './Toggle.svelte';
	import Switch from './Switch.svelte';
	
	

	//import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
	// let src="/socket.io/socket.io.js"
	var socket = io('http://10.204.0.121:8080/dashboard');
	console.log("connected");
	//var socket = io('10.200.32.0');
	let isCalibrate;
	let active = 'Trial Management';

	let calibration = {'camera-1':false, 'camera-2':false, 'camera-3':false, 'camera-4':false, 'camera-5':false, 'camera-6':false};
	let lightStatus = {'camera-1':false, 'camera-2':false, 'camera-3':false, 'camera-4':false, 'camera-5':false, 'camera-6':false};

	let participantNameD = "Participant";
	let participantName = "Participant";
	let roundNumber = 0;
	let conditionNumber = 0;
	let faceSensitivity = 20;
	let oldFaceSensitivity = 20;
	let gazeSensitivity = 10;
	let oldGazeSensitivity = 10;
	
	let currentPattern = 'Unset';

	let feedback_type = 'on';

	let ringFrom=0;
	let ringTo = 0;
	let ringColR = 0;
	let ringColG = 0;
	let ringColB = 0;

	$: {
		setFeedbackType(feedback_type);
		console.log(feedback_type);
	}

	


	import { onMount } from 'svelte';
	onMount(() => {

	  // socket = new WebSocket("ws://localhost:8000/chat")
	  // socket.addEventListener("open", ()=> {
	  //   console.log("Opened")
	  // })
	  	console.log("onmount");

	});
	socket.on('game', function(msg) {
		//catch updates from server
		//jsonData = JSON.parse(msg);
		console.log(msg);
		var payload = JSON.parse(msg);
  		switch (payload['command']) {
		case "passCheck":
			//TODO: Some display of ongoing stuff
			break;
		case "failCheck":
			//TODO: Some display of ongoing stuff
			break;
		case "newQuiz":
			//TODO: Some display of ongoing stuff
			console.log("New Quiz Detected");
			roundNumber++;
			break;
		case "bulb":
			var but = payload["bulb"];
			var status = payload["status"];
			lightStatus[but] = status=='On'?true:false;
			console.log(but+" change to "+status);
			break;
		case "calibrationComplete":
			var but = payload["bulb"];
			calibration[but] =true;
			console.log(but+" calibration done");
			break;
		case "interactionStatus":
			var but = payload["bulb"];
			var machine = payload["machine"];
			var pattern = payload["pattern_length"];
			console.log(but+" at state"+ machine+" out of "+ pattern);
			//Should probably display in dash too?			
		}
	});

	function handleBoxClick(boxString){
		if(isCalibrate){
			socket.emit('game', '{"command":"calibrate", "camString":"'+boxString+'"}');
			calibration[boxString] = true; //testing wait for callback
			console.log(boxString);
		}else{
			socket.emit('game', '{"command":"toggleCamera", "camString":"'+boxString+'", "status":"off"}');
			lightStatus[boxString] = !lightStatus[boxString];//testing wait for callback
		}


	}


	function setRing(){
		console.log('{"command":"setRings", "from":"'+ringFrom+'", "to":"'+ringTo+'", "r":"'+ringColR+'", "g":"'+ringColG+'", "b":"'+ringColB+'"}');
		socket.emit('game', '{"command":"setRings", "from":"'+ringFrom+'", "to":"'+ringTo+'", "r":"'+ringColR+'", "g":"'+ringColG+'", "b":"'+ringColB+'"}');
	}

	function clearRing(){

		socket.emit('game', '{"command":"setRings", "from":"0", "to":"11", "r":"0", "g":"0", "b":"0"}');
	}

	function sendNewgame(){

		socket.emit('game', '{"command":"newQuiz"}');
	}

	function setSensitivity(){

		socket.emit('game', '{"command":"setSensitivity", "face":"'+faceSensitivity+'", "gaze":"'+gazeSensitivity+'"}');
		oldFaceSensitivity = faceSensitivity;
		oldGazeSensitivity = gazeSensitivity;

	}

	function setPattern(patternString){
		if(patternString != currentPattern){
			conditionNumber++;
			roundNumber = 1;
			socket.emit('game', '{"command":"setInteraction", "interaction_pattern":"'+patternString+'", "condition":"'+conditionNumber+'"}');
			currentPattern = patternString;

		}
	}

	function setFeedbackType(feedback_type){		
			if(feedback_type == 'on'){
				socket.emit('game', '{"command":"setFeedback", "feedback_type":"followMe"}');			
			}else{
				socket.emit('game', '{"command":"setFeedback", "feedback_type":"rotate"}');			
			}
			
	}

	function setParticipant(){
		if(participantName != participantNameD){
			socket.emit('game', '{"command":"logParticipant", "name":"'+participantNameD+'"}');
			participantName = participantNameD;
			//New Participant - so recalibrate?
			calibration = {'camera-1':false, 'camera-2':false, 'camera-3':false, 'camera-4':false, 'camera-5':false, 'camera-6':false};
		}
	}

	function setCondition(con){
		if(con != conditionNumber){
			socket.emit('game', '{"command":"setCondition", "value":"'+con+'"}');
			conditionNumber = con;
			roundNumber = 0;
		}
	}

	function forceSkip(){
		socket.emit('game', '{"command":"logString", "logString":"Skip Forced from Dashboard"}');
		socket.emit('game', '{"command":"newQuiz"}');
	}

	function setRound(con){
		if(con != roundNumber){
			socket.emit('game', '{"command":"setRound", "value":"'+con+'"}');
			roundNumber = con;
			socket.emit('game', '{"command":"newQuiz"}');
		}
	}

</script>


<main>


	<!-- <TabBar tabs={['Trial Management', 'Settings and Calibration']} let:tab bind:active>
		<!-- Note: the `tab` property is required! -->
		<!-- <Tab {tab}> -->
		  <!-- <Label>{tab}</Label> -->
		<!-- </Tab> -->
	<!-- </TabBar> -->
	 


	<Toggle bind:checked={isCalibrate} let:checked={checked}>
		<button>
			{checked ? 'Calibration Mode' : 'Light Control'}
		</button>
	</Toggle>

	<table>
		<tr>
			<td>
				<button class="button" id="camera-1" on:click={() => handleBoxClick("camera-1")}>
						Box 1 <br>
						Light On: {lightStatus['camera-1']} |
						Calibrated: {calibration['camera-1']}<br>
				</button>
				
			</td><td>
				<button class="button" id="camera-2" on:click={() => handleBoxClick("camera-2")}>
						Box 2<br>
						Light On: {lightStatus['camera-2']} |
						Calibrated: {calibration['camera-2']}<bR>
				</button>
			</td><td>
				<button class="button" id="camera-3" on:click={() => handleBoxClick("camera-3")}>
						Box 3<br>
						Light On: {lightStatus['camera-3']} |
						Calibrated: {calibration['camera-3']}<bR>
				</button>
			</td>
	</tr><tr>
			<td>
				<button class="button" id="camera-4" on:click={() => handleBoxClick("camera-4")}>
						Box 4<br>
						Light On: {lightStatus['camera-4']} |
						Calibrated: {calibration['camera-4']}<bR>
				</button>
			</td><td>
				<button class="button" id="camera-5" on:click={() => handleBoxClick("camera-5")}>
						Box 5<br>
						Light On: {lightStatus['camera-5']} |
						Calibrated: {calibration['camera-5']}<bR>
				</button>
			</td><td>
				<button class="button" id="camera-6" on:click={() => handleBoxClick("camera-6")}>
						Box 6<br>
						Light On: {lightStatus['camera-6']} |
						Calibrated: {calibration['camera-6']}<bR>
				</button>
		</td>
	</tr>
	</table>
	<br>

	<h3>Testing LightRings</h3>

	From<br>
	<label>
		<input type=number bind:value={ringFrom} min=0 max=11>
		<input type=range bind:value={ringFrom} min=0 max=11>
	</label>
	To<br>
	<label>
		<input type=number bind:value={ringTo} min=0 max=11>
		<input type=range bind:value={ringTo} min=0 max=11>
	</label>
	R
	<label>
		<input type=number bind:value={ringColR} min=0 max=255>
		<input type=range bind:value={ringColR} min=0 max=255>
	</label>
	G
	<label>
		<input type=number bind:value={ringColG} min=0 max=255>
		<input type=range bind:value={ringColG} min=0 max=255>
	</label>
	B
	<label>
		<input type=number bind:value={ringColB} min=0 max=255>
		<input type=range bind:value={ringColB} min=0 max=255>
	</label>
	<button class="button" id="setLight" on:click={() => setRing()}>
		setRing
	</button>
	<button class="button" id="setLight" on:click={() => clearRing()}>
		Clear Rings
	</button>


	<br>
	<h3>Set Interaction Pattern</h3>
	<button class="button" id="pattern1" on:click={() => setPattern("center center center center")}>
		"center center center center"
	</button>
	<button class="button" id="pattern2" on:click={() => setPattern("center center left left")}>
		"center center left left"
	</button>
	<button class="button" id="pattern3" on:click={() => setPattern("center center up up")}>
		"center center up up"
	</button>
	<button class="button" id="pattern4" on:click={() => setPattern("center center down down right right")}>
		"center center down down right right"
	</button>
	<button class="button" id="pattern5" on:click={() => setPattern("center center right right up up")}>
		"center center right right up up"
	</button>
	<h4>Current Pattern: {currentPattern}</h4>
	
	<br>
	<Switch bind:value={feedback_type} label="'Enable Followme'" design="inner" />

	Face Sensitivity<br>
	<label>
		<input type=number bind:value={faceSensitivity} min=2 max=40>
		<input type=range bind:value={faceSensitivity} min=2 max=40>
	</label>
	Gaze Sensitivity<br>
	<label>
		<input type=number bind:value={gazeSensitivity} min=2 max=20>
		<input type=range bind:value={gazeSensitivity} min=2 max=20>
	</label>
	<button class="button" disabled='{(faceSensitivity == oldFaceSensitivity) & (gazeSensitivity == oldGazeSensitivity)}' id="sensitivity" on:click={() => setSensitivity()}>
		Update Face Sensitivity	
	</button>

	<br><br>
	<h3>Trial Management</h3>
	<button class="button" id="Update Participant" on:click={() => setParticipant()}>
		Set Participant
	</button> <input bind:value={participantNameD}><br>
	<button class="button" id="reset conditions" on:click={() => setCondition(1)}>
		Reset Condition
	</button>
	<button class="button" id="reset rounts" on:click={() => setRound(1)}>
		Reset Round
	</button>
	<h3>Participant: {participantName}, condition {conditionNumber}, round {roundNumber}</h3>

	<button class="button" id="nextRound" on:click={() => forceSkip()}>
		Next Round
	</button>

	<button class="button" id="nextCondition" on:click={() => setCondition(conditionNumber+1)}>
		Next Condition
	</button>




</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
