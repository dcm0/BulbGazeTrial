<script>
	export let name;
	import { io } from "socket.io-client";
	//import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
	// let src="/socket.io/socket.io.js"
	var socket = io('http://192.168.137.1:8080/dashboard');
	console.log("UOSOSOSOSOS");
	//var socket = io('10.200.32.0');

	import { onMount } from 'svelte';
	onMount(() => {

	  // socket = new WebSocket("ws://localhost:8000/chat")
	  // socket.addEventListener("open", ()=> {
	  //   console.log("Opened")
	  // })
	  	console.log("onmount"	);
		
	});
	socket.on('game', function(msg) {
		jsonData = JSON.parse(msg);
		if (jsonData["command"] == "passCheck"){

		} else if (jsonData["command"] == "failCheck") {

		} else if (jsonData["command"] == "newQuiz") {
			
		}
	});
	
	function sendNewgame(){

		console.log('ububuub');
		socket.emit('game', '{command:"newQuiz"}');
	}

</script>

<main>
	<h1>Hello {name}!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
	
<p> One dim</p>
<button class="button" on:click={() => sendNewgame()}>
1
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