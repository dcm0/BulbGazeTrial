<script>
import { tweened } from 'svelte/motion';
export let completed;
let original = 0; // TYPE NUMBER OF SECONDS HERE
let timer = tweened(original)
setInterval(() => {
    if ($timer < 60*5 && !completed) $timer++;
  }, 1000);
  
$: {
  if(completed){
    console.log("printed!")
    document.getElementById('textThingy').style.color = "lightgreen";
  }
}
$: minutes = Math.floor($timer / 60);
$: seconds = Math.floor($timer - minutes * 60)
</script>
<div class="timer">
<h1 id="textThingy"><span class="mins">{minutes}</span>:<span class="secs">{seconds}</span></h1>
</div>
<style>
.timer{
  text-align: center;
}

</style>
