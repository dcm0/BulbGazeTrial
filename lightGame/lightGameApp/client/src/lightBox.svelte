<script>
	export let name = 'a1';
	export let idVal = 0;
	export let colorList;
</script>

<div id={name} style="background-color: {colorList[idVal]}; height: 50px; width: 50px;">
</div>

<style>
	div{
    float:left;
		margin:25px;
    position: relative;
		}
</style>
