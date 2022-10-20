<script>
	import { io } from "socket.io-client";
	import Toggle from './Toggle.svelte';
	import Switch from './Switch.svelte';
	import { Tabs, TabList, TabPanel, Tab } from './tabs.js';




	//import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
	// let src="/socket.io/socket.io.js"
	var socket = io('http://10.204.0.121:8080/dashboard');
	console.log("connected");
	//var socket = io('10.200.32.0');
	let active = 'Trial Management';

	let calibration = {'camera-1':false, 'camera-2':false, 'camera-3':false, 'camera-4':false, 'camera-5':false, 'camera-6':false};
	let lightStatus = {'camera-1':false, 'camera-2':false, 'camera-3':false, 'camera-4':false, 'camera-5':false, 'camera-6':false};
	let canvas = {'camera-1':null, 'camera-2':null, 'camera-3':null, 'camera-4':null, 'camera-5':null, 'camera-6':null};
	let lastRing = {'camera-1':null, 'camera-2':null, 'camera-3':null, 'camera-4':null, 'camera-5':null, 'camera-6':null};
	let gestureList = ["center center center center", "center center left left", "center center up up", "center center down down right right", "center center right right up up"];
	let presetTrial = ["Trial 1", "Trial 2", "Trial 3", "Trial 4", "Trial 5", "Custom Trial"];
	let cameraList = ["camera-1", "camera-2", "camera-3", "camera-4", "camera-5", "camera-6"];
	let newPattern;

	let participantNameD = "Participant";
	let participantName = "Participant";
	let roundNumber = 0;
	let conditionNumber = 0;
	let faceSensitivity = 20;
	let oldFaceSensitivity = 20;
	let gazeSensitivity = 10;
	let oldGazeSensitivity = 10;

	let currentPatternArray = {'camera-1':"center center", 'camera-2':"center center", 'camera-3':"center center", 'camera-4':"center center", 'camera-5':"center center", 'camera-6':"center center"};
	let currentPresetTrial = "Trial 1"
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
		let keys = Object.keys(calibration);
		keys.forEach(boxString => updateRingCanvas(boxString, testRing()));

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
		case "lightStatus":
			var but = payload["bulb"];
			var ls = payload["lightStatus"];
			lightStatus[but] = ls;
			but = but.substring(1);
			updateRingCanvas(but, lastRing[but]);
			break;
		case "ringStatus":
			var but = payload["bulb"];
			but = but.substring(1);
			var ring = payload["lightRing"];
			lastRing[but] = ring;
			updateRingCanvas(but, ring);
			break;
		case "interactionStatus":
			var but = payload["bulb"];
			var machine = payload["machine"];
			var pattern = payload["pattern_length"];
			//var ringStatus = payload["ring_status"];
			console.log(but+" at state"+ machine+" out of "+ pattern);
			//Should probably display in dash too?
		}
	});


	function testRing(){

		var lightString = "{";
        for (let index = 0; index < 12; index++) {
			let r = Math.floor(Math.random() * 255);
			let g = Math.floor(Math.random() * 255);;
			let b = Math.floor(Math.random() * 255);;
            lightString = `${lightString} "${index}r": "${r}", "${index}g":"${g}", "${index}b":"${b}"`;
            if(index!=11){
                lightString = lightString + ", ";
            }else{
				lightString = lightString + "}";
			}
        }
		//console.log( Math.floor(Math.random() * 255));
        //console.log(lightString);
		return JSON.parse(lightString);

	}

	function handleBoxClick(boxString, isCalibrate){
		if(isCalibrate){
			socket.emit('game', '{"command":"calibrate", "camString":"'+boxString+'"}');
			calibration[boxString] = true; //testing wait for callback
			console.log(boxString);
		}else{
			socket.emit('game', '{"command":"toggleCamera", "camString":"'+boxString+'", "status":"off"}');
			lightStatus[boxString] = !lightStatus[boxString];//testing wait for callback

			//ringTests

			updateRingCanvas(boxString, testRing());

		}

	}

	function sendCameraSpecificPatterns(){

	// json with camera
	}

	function updateRingCanvas(boxString, ringString){
		console.log(ringString)
		let ctx = canvas[boxString].getContext('2d');

		//Bulb
		ctx.beginPath();
		ctx.fillStyle = lightStatus[boxString]?'rgb(255, 228, 42)':'rgb(255, 255, 255)';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.arc(28.379272, 28.379236, 9.997467, 0.000000, 6.28318531, 1);
		ctx.fill();
		ctx.stroke();

		// #rect0
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['0r']+','+ringString['0g']+','+ringString['0b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(29.702194, 47.051254, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect1
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['1r']+','+ringString['1g']+','+ringString['1b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(18.381809, 47.051258, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect2
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['2r']+','+ringString['2g']+','+ringString['2b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(9.707262, 38.376709, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect3
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['3r']+','+ringString['3g']+','+ringString['3b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(1.032715, 29.702162, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect4
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['4r']+','+ringString['4g']+','+ringString['4b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(1.032712, 18.381773, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect5
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['5r']+','+ringString['5g']+','+ringString['5b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(9.707260, 9.707223, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect6
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['6r']+','+ringString['6g']+','+ringString['6b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(18.381809, 1.032674, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();



		// #rect7
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['7r']+','+ringString['7g']+','+ringString['7b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(29.702194, 1.032674, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();


		// #rect8
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['8r']+','+ringString['8g']+','+ringString['8b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(38.376743, 9.707223, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect9
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['9r']+','+ringString['9g']+','+ringString['9b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(47.051292, 18.381773, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect10
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['10r']+','+ringString['10g']+','+ringString['10b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(47.051292, 29.702158, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();

		// #rect11
		ctx.beginPath();
		ctx.fillStyle = 'rgb('+ringString['11r']+','+ringString['11g']+','+ringString['11b']+')';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
		ctx.rect(38.376743, 38.376705, 8.674548, 8.674548);
		ctx.fill();
		ctx.stroke();


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

	function setPattern(patternArray){
		if(patternArray != currentPatternArray){
			conditionNumber++;
			roundNumber = 1;
			// TODO: change here!
			socket.emit('game', '{"command":"setInteraction", "interaction_pattern":"'+patternArray+'", "condition":"'+conditionNumber+'"}');
			currentPatternArray = patternArray;

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

	function checkNewPattern(){
		if(validatePattern(newPattern)){
			if(gestureList.includes(newPattern)){
				setPattern(newPattern);
			}else{
				gestureList.push(newPattern);
				gestureList = gestureList;
				setPattern(newPattern);
				//Send new pattern string to be stored on the server?
			}


		}else{
			console.log("error pattern "+newPattern);
		}
	}

	function validatePattern(pattern) {
    	var patRegEx = /^((down|up|left|right|center| ){3,})$/;
    	return patRegEx.test(String(pattern).toLowerCase());
  	}

</script>


<main>


	<!-- <TabBar tabs={['Trial Management', 'Settings and Calibration']} let:tab bind:active>
		<!-- Note: the `tab` property is required! -->
		<!-- <Tab {tab}> -->
		  <!-- <Label>{tab}</Label> -->
		<!-- </Tab> -->
	<!-- </TabBar> -->

	<Tabs>
		<TabList>
			<Tab>Status</Tab>
			<Tab>Calibration</Tab>
		</TabList>

		<TabPanel>
			<center>
				<h2>Click to toggle light</h2>
			<table>
				<tr>
					<td>
						<button class="button" id="camera-1" on:click={() => handleBoxClick("camera-1", false)}>
								Box 1 <br>
								<canvas width='70' height='70' bind:this={canvas["camera-1"]}></canvas>

								Light On: {lightStatus['camera-1']} |
								Calibrated: {calibration['camera-1']}<br>
						</button>

					</td><td>
						<button class="button" id="camera-2" on:click={() => handleBoxClick("camera-2", false)}>
								Box 2<br>
								<canvas width='70' height='70' bind:this={canvas["camera-2"]}></canvas>
								Light On: {lightStatus['camera-2']} |
								Calibrated: {calibration['camera-2']}<bR>
						</button>
					</td><td>
						<button class="button" id="camera-3" on:click={() => handleBoxClick("camera-3", false)}>
								Box 3<br>
								<canvas width='70' height='70' bind:this={canvas["camera-3"]}></canvas>
								Light On: {lightStatus['camera-3']} |
								Calibrated: {calibration['camera-3']}<bR>
						</button>
					</td>
			</tr><tr>
					<td>
						<button class="button" id="camera-4" on:click={() => handleBoxClick("camera-4", false)}>
								Box 4<br>
								<canvas width='70' height='70' bind:this={canvas["camera-4"]}></canvas>
								Light On: {lightStatus['camera-4']} |
								Calibrated: {calibration['camera-4']}<bR>
						</button>
					</td><td>
						<button class="button" id="camera-5" on:click={() => handleBoxClick("camera-5", false)}>
								Box 5<br>
								<canvas width='70' height='70' bind:this={canvas["camera-5"]}></canvas>
								Light On: {lightStatus['camera-5']} |
								Calibrated: {calibration['camera-5']}<bR>
						</button>
					</td><td>
						<button class="button" id="camera-6" on:click={() => handleBoxClick("camera-6", false)}>
								Box 6<br>
								<canvas width='70' height='70' bind:this={canvas["camera-6"]}></canvas>
								Light On: {lightStatus['camera-6']} |
								Calibrated: {calibration['camera-6']}<bR>
						</button>
				</td>
			</tr>
			</table>
		</center>
			<br>

		</TabPanel>

		<TabPanel>
			<center>
				<h2>Click to start calibration</h2>
				<table>
				<tr>
					<td>
						<button class="button" id="camera-1" on:click={() => handleBoxClick("camera-1", true)}>
								Box 1 <br>
								Light On: {lightStatus['camera-1']} |
								Calibrated: {calibration['camera-1']}<br>
						</button>

					</td><td>
						<button class="button" id="camera-2" on:click={() => handleBoxClick("camera-2", true)}>
								Box 2<br>
								Light On: {lightStatus['camera-2']} |
								Calibrated: {calibration['camera-2']}<bR>
						</button>
					</td><td>
						<button class="button" id="camera-3" on:click={() => handleBoxClick("camera-3", true)}>
								Box 3<br>
								Light On: {lightStatus['camera-3']} |
								Calibrated: {calibration['camera-3']}<bR>
						</button>
					</td>
			</tr><tr>
					<td>
						<button class="button" id="camera-4" on:click={() => handleBoxClick("camera-4", true)}>
								Box 4<br>
								Light On: {lightStatus['camera-4']} |
								Calibrated: {calibration['camera-4']}<bR>
						</button>
					</td><td>
						<button class="button" id="camera-5" on:click={() => handleBoxClick("camera-5", true)}>
								Box 5<br>
								Light On: {lightStatus['camera-5']} |
								Calibrated: {calibration['camera-5']}<bR>
						</button>
					</td><td>
						<button class="button" id="camera-6" on:click={() => handleBoxClick("camera-6", true)}>
								Box 6<br>
								Light On: {lightStatus['camera-6']} |
								Calibrated: {calibration['camera-6']}<bR>
						</button>
				</td>
			</tr>
			</table>
			<br>
				</center>


		</TabPanel>
</Tabs>

	<Tabs>
		<TabList>
			<Tab>Interaction Pattern</Tab>
			<Tab>Sensitivity Settings</Tab>
			<Tab>Light Ring Testing</Tab>
		</TabList>



	<TabPanel>
	<table>
	{#each presetTrial as value}
	<th>
		<label><input type="radio" {value} bind:group={currentPresetTrial}> {value}</label>
		</th>
	{/each}
	</table>

	{#each cameraList as camera}
	<h4>{camera}</h4>
		{#each gestureList as value}
		<label><input type="radio" {value} bind:group={currentPatternArray[camera]}> {value}</label>
		{/each}
	{/each}
	<br>
	<input type=text name="newPat" bind:value={newPattern} pattern="{String.raw`(down|up|left|right|center| ){3,}`}">
	<!-- TODO: change checkNewPattern -->
	<button on:click={() => checkNewPattern()}>
		Submit Pattern
	</button>
	<br>
	<!-- <h4>Current Pattern: {currentPattern}</h4> -->

	<br>
	<Switch bind:value={feedback_type} label="'Enable Followme'" design="inner" />
	</TabPanel>

	<TabPanel>
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
	</TabPanel>

	<TabPanel>
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
	</TabPanel>
</Tabs>

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
