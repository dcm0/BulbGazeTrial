<script>
	import LightBox from './lightBox.svelte';
	import Timer from './timer.svelte';
  export let chosenGameValue = 1;
  export let chosenGameMode = 1;
	export let activeList;
	export let socket;
	export let completed;
	export let gameActive;
	export let checked;
	let started = false;
  let activeColor = "#eee310";
  let passiveColor = "#888888";
  let iteration = 1;
  let maxIterations = 10;
  let itemList = [0,1,2,3,4,5]
  let colorList = ["#888888","#888888","#888888","#888888","#888888","#888888"]
  let srcList = ["./interactionTypes/1.svg","./interactionTypes/2.svg","./interactionTypes/3.svg","./interactionTypes/4.svg","./interactionTypes/5.svg"]
	let checkButton;
	$:{
		if(checked>0){
			checkButton = document.getElementById('check');
			checkButton.style.webkitAnimationName = 'shake';
			checkButton.addEventListener('webkitAnimationEnd', function(){
				this.style.webkitAnimationName = '';
			}, false);
		}
	}

	function skip(){
    socket.emit('game', '{"command":"skip"}');
  }
	function start(){
		socket.emit('game', '{"command":"start_timer"}');
		started = true;
	}

	function check(){
		socket.emit('game', '{"command":"check"}');
	}
	function next(){
		socket.emit('game', '{"command":"next"}');
	}
	// socket.on('game', function(msg) {
	// 	console.log(msg);
	// 	if(msg=true){
	// 		complete=true;
	// 	}
	// });
  function initNewRound(activeList){
		console.log(chosenGameMode)
		started = false;
		checked=0;
    //shuffle(itemList)
		completed=false;
		console.log("reinit")
    for (let i = 0; i<6;i++){
			colorList[i] = passiveColor;
			if(activeList[i] == 1){
				colorList[i] = activeColor;
			}
    }
    // for (let i = 0; i<6;i++){
    //   colorList[i] = passiveColor;
    // }
    // for (let i = 0; i<chosenGameValue;i++){
    //   colorList[itemList[i]] = activeColor;
    // }
  }
  initNewRound(activeList)
	$: {
		initNewRound(activeList);
	}

//   function shuffle(array) {
//     let currentIndex = array.length,  randomIndex;
//
//     // While there remain elements to shuffle...
//     while (currentIndex != 0) {
//
//       // Pick a remaining element...
//       randomIndex = Math.floor(Math.random() * currentIndex);
//       currentIndex--;
//
//       // And swap it with the current element.
//       [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
//       }
//
//     return array;
// }
</script>
<div class="box-container">
<div id="interaction-type">
<img src={srcList[chosenGameMode-1]} id="intType">
</div>
</div>

<div class="box-container">
	<div id="a">
		<LightBox name="a1" idVal = 0 bind:colorList/>
		<LightBox name="a2" idVal = 1 bind:colorList/>
		<LightBox name="a3" idVal = 2 bind:colorList/>
	</div>

	<div id="b">
		<LightBox name="b1" idVal = 3 bind:colorList/>
		<LightBox name="b2" idVal = 4 bind:colorList/>
		<LightBox name="b3" idVal = 5 bind:colorList/>
	</div>
</div>
{#if !started}
<button id="start" class="button" on:click={start}>
start
</button>
{:else}
<Timer bind:completed/>
<div class="button-container">
{#if completed}
	<button id="next" class="button" on:click={next}>
		next
	</button>
{:else}
<button id="check" class="button" on:click={check}>
	check
</button>
	<!-- <button id="skip" class="button" on:click={skip}>
		skip
	</button> -->
{/if}
</div>
		{/if}
<style>
	.box-container{
		margin: auto;
		margin-top: 0px;
		width: 300px;
		margin-bottom: 50px;
	}
	#a{
		height: 100px;
		width: 300px;
	}
	#b{
		height: 100px;
		width: 300px;
	}
	.button-container{
		margin: auto;
		margin-top: 50px;
		width: 170px;
	}
	.button{
		width: 150px;
  	border: 1px solid;
  	border-radius: 6px;
  	box-shadow: rgba(0, 0, 0, 0.1) 1px 2px 4px;
  	box-sizing: border-box;
  	color: #FFFFFF;
  	cursor: pointer;
  	display: inline-block;
  	font-family: nunito,roboto,proxima-nova,"proxima nova",sans-serif;
  	font-size: 25px;
  	font-weight: 800;
  	line-height: 16px;
  	min-height: 60px;
  	outline: 0;
  	padding: 12px 14px;
  	text-align: center;
  	text-rendering: geometricprecision;
  	text-transform: none;
  	user-select: none;
  	-webkit-user-select: none;
 	 touch-action: manipulation;
 	 vertical-align: middle;
	 margin-top: 50px;
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
#start{
	margin: 0 auto;
display: block;
background-color:#FF2525;
border-color:#FF2525;

}
	#skip{
		background-color:#FF2525;
		border-color:#FF2525;

	}
	#next{
		background-color:lightgreen;
		border-color:lightgreen;
		margin: 0 auto;
		display: block;
	}
	#check{
		background-color:lightgreen;
		border-color:lightgreen;
		margin: 0 auto;
	display: block;
	}
  #intType{

		width: 200px;
		height: 200px;
		margin-left: 50px;
  }
	#shake{
  /* Start the shake animation and make the animation last for 0.5 seconds */
  animation: shake 0.5s;

  /* When the animation is finished, start again */
  animation-iteration-count: infinite;
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}
</style>
