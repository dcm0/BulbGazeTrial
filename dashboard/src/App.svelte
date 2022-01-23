<script>
	import { io } from "socket.io-client";
	import Toggle from './Toggle.svelte'
	//import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
	// let src="/socket.io/socket.io.js"
	var socket = io('http://192.168.137.1:8080/dashboard');
	console.log("connected");
	//var socket = io('10.200.32.0');
	let isCalibrate;
	let camera1on = false;
	let camera2on = false;
	let camera3on = false;
	let camera4on = false;
	let camera5on = false;
	let camera6on = false;		
	let participantNameD = "Participant";
	let participantName = "Participant";
	let roundNumber = 1;
	let conditionNumber = 1;
	let currentPattern = 'Unset';


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
		jsonData = JSON.parse(msg);
		payload = JSON.parse(json_data);
  		switch (payload['command']) {
		case "passCheck":
			break;
		case "failCheck":
			break;
		case "newQuiz":
			console.log("New Quiz Detected");
			roundNumber++;
			break;
		case "bulb":
			var but = payload["bulb"];
			var status = payload["status"];
			console.log(but+" change to "+status);
			break;

		}
	});

	function handleBoxClick(boxString){
		if(isCalibrate){
			socket.emit('game', '{"command":"calibrate", "camString":"'+boxString+'"}');
		}else{
			socket.emit('game', '{"command":"toggleCamera", "camString":"'+boxString+'", "status":}');
		}


	}
	
	function sendNewgame(){

		socket.emit('game', '{"command":"newQuiz"}');
	}

	function setPattern(patternString){
		if(patternString != currentPattern){
			conditionNumber++;
			roundNumber = 1;
			socket.emit('game', '{"command":"updatePattern", "pattern":"'+patternString+'", "condition":"'+conditionNumber+'}');
			currentPattern = patternString;
			
		}
	}

	function setParticipant(){
		if(participantName != participantNameD){
			socket.emit('game', '{"command":"logParticipant", "name":"'+participantNameD+'"}');
			participantName = participantNameD;
		}
	}

	function setCondition(con){
		if(con != conditionNumber){
			socket.emit('game', '{"command":"setCondition", "value":"'+con+'"}');
			conditionNumber = con;
		}
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
	
	
	<Toggle bind:checked={isCalibrate} let:checked={checked}>
		<button>
			{checked ? 'Calibration Mode' : 'Light Control'}
		</button>
	</Toggle>


	<button class="button" id="camera-1" on:click={() => handleBoxClick("camera-1")}>
			Box 1
	</button>
	<button class="button" id="camera-2" on:click={() => handleBoxClick("camera-2")}>
			Box 2
	</button>
	<button class="button" id="camera-3" on:click={() => handleBoxClick("camera-3")}>
			Box 3
	</button>
	<br>
	<button class="button" id="camera-4" on:click={() => handleBoxClick("camera-4")}>
			Box 4
	</button>
	<button class="button" id="camera-5" on:click={() => handleBoxClick("camera-5")}>
			Box 5
	</button>
	<button class="button" id="camera-6" on:click={() => handleBoxClick("camera-6")}>
			Box 6
	</button>
	<br>
	<br>
	<h3>Set Interaction Pattern</h3>
	
	<button class="button" id="pattern1" on:click={() => setPattern("center center center left")}>
		"center center center left"	
	</button>
	<button class="button" id="pattern2" on:click={() => setPattern("center left left left left center")}>
		"center left left left left center"	
	</button>
	<button class="button" id="pattern3" on:click={() => setPattern("center up center up center")}>
		"center up center up center"	
	</button>
	<button class="button" id="pattern4" on:click={() => setPattern("center center center center right")}>
		"center center center center right"	
	</button>
	<button class="button" id="pattern5" on:click={() => setPattern("center center center center right")}>
		"center center center center right"	
	</button>
	<h4>Current Pattern: {currentPattern}</h4>

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

	<button class="button" id="nextRound" on:click={() => setRound(roundNumber+1)}>
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