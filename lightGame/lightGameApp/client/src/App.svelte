<script>
	let name = 'Light box game';
	let gameActive = false;
	let chosenGameMode = 0;
	let chosenGameValue = 0;
	let activeList = [0,0,0,0,0,0]
	let jsonData;
	let form;


	import GameView from './game.svelte';

	import { io } from "socket.io-client";
	//import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
	// let src="/socket.io/socket.io.js"
	console.log("hiyaa")
	var socket = io('http://192.168.137.1:8080/controller');
	//var socket = io('10.200.32.0');



	function setGame(gameValue, gameMode) {
		chosenGameValue = gameValue;
		gameActive = true;
		chosenGameMode = gameMode
	}
	$: if (chosenGameValue == 0) {
		gameActive = false
		chosenGameMode = 0;

	}


  import { onMount } from 'svelte';
	onMount(() => {

	  // socket = new WebSocket("ws://localhost:8000/chat")
	  // socket.addEventListener("open", ()=> {
	  //   console.log("Opened")
	  // })
		socket.emit('game', "hello");
	})
	socket.on('game', function(msg) {
	console.log(msg);
	updateGameMode(msg)
});



	function updateGameMode(jsonData){
		chosenGameMode = jsonData["gameMode"];
		activeList = jsonData["lightList"];
	}

</script>
<form></form>
<h1>{name}!</h1>
{#if !gameActive}
<div class="button-container">
<p> One dim</p>
<button class="button" on:click={() => setGame(1, 1)}>
1
</button>
<button class="button" on:click={() => setGame(2, 1)}>
2
</button>
<button class="button" on:click={() => setGame(3, 1)}>
3
</button>
</div>
<div class="button-container">
<p> Two dim</p>
<button class="button" on:click={() => setGame(1, 2)}>
1
</button>
<button class="button" on:click={() => setGame(2, 2)}>
2
</button>
<button class="button" on:click={() => setGame(3, 2)}>
3
</button>
</div>
{:else}
	<GameView bind:chosenGameValue bind:chosenGameMode bind:activeList bind:socket/>
{/if}
<style>
	h1{
		font-weight: 500;
		margin: auto;
		text-align: center;
		margin-top: 50px;
	}
	.button-container{
		margin: auto;
		margin-top: 50px;
		width: 400px;
		border: 3px solid #111111;
		padding: 10px
	}
	.button{
		background-color: #111111;
		width: 70px;
		border: 1px solid #111111;
		border-radius: 6px;
		box-shadow: rgba(0, 0, 0, 0.1) 1px 2px 4px;
		box-sizing: border-box;
		color: #FFFFFF;
		cursor: pointer;
		display: inline-block;
		font-family: nunito,roboto,proxima-nova,"proxima nova",sans-serif;
		font-size: 16px;
		font-weight: 800;
		line-height: 16px;
		min-height: 40px;
		outline: 0;
		padding: 12px 14px;
		text-align: center;
		text-rendering: geometricprecision;
		text-transform: none;
		user-select: none;
		-webkit-user-select: none;
	 touch-action: manipulation;
	 vertical-align: middle;
}

.button:hover,
.button:active {
	background-color: initial;
	background-position: 0 0;
	color: #333333;
}

.button:active {
	opacity: .5;
}
</style>
