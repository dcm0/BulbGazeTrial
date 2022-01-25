<script>
	export let animationType;
	let clicked = false;
	let timeoutId = 0;
	const onClick = () => {
		clicked = !clicked;
		timeoutId++;
		const tId = timeoutId;
		setTimeout(() => {
			// cancel timeout if new was set
			if(tId === timeoutId)
				clicked = false;
		}, 1000);
	}
</script>

<!-- trigger onclick so demo works on mobile -->
<span class={`boop${clicked ? (" " + animationType) : ""}`} class:active={clicked} on:click={onClick} on:mouseenter={onClick} style="--animation: boop">
	<slot/>
</span>
<style>
	@keyframes wiggle {
		0% {
			transform: rotate(0deg);
		}
		20% {
			transform: rotate(-15deg);
		}
		40% {
			transform: rotate(15deg);
		}
		60% {
			transform: rotate(-7deg);
		}
		80% {
			transform: rotate(7deg);
		}
		90% {
			transform: rotate(-3deg);
		}
		95% {
			transform: rotate(2deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}
	.boop {
		display: inline-block;
	}
	.boop.active {
		animation-duration: 1s;
		animation-play-state: paused;
		animation-fill-mode: forwards;
	}
	.boop.wiggle {
		animation-name: wiggle;
		animation-play-state: running;
	}
	@keyframes scale-wiggle {
		0% {
			transform: scale(1);
		}
		20% {
			transform: scale(1.2);
		}
		40% {
			transform: scale(0.9);
		}
		60% {
			transform: scale(1.15);
		}
		80% {
			transform: scale(0.95);
		}
		90% {
			transform: scale(1.02);
		}
		95% {
			transform: scale(0.98);
		}
		100% {
			transform: scale(1);
		}
	}
	.boop.scale-wiggle {
		animation-name: scale-wiggle;
		animation-play-state: running;
	}
	@keyframes pos-y-wiggle {
		0% {
			transform: translateY(0px);
		}
		20% {
			transform: translateY(10px);
		}
		40% {
			transform: translateY(-10px);
		}
		60% {
			transform: translateY(5px);
		}
		80% {
			transform: translateY(-5px);
		}
		90% {
			transform: translateY(1px);
		}
		95% {
			transform: translateY(-1px);
		}
		100% {
			transform: translateY(0px);
		}
	}
	.boop.pos-y-wiggle {
		animation-name: pos-y-wiggle;
		animation-play-state: running;
	}
</style>
