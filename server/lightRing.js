class lightRing {
    

    constructor(r, g, b) {
        this.no_lights = 12;
        this.lightArray = new Array();
        for (let index = 0; index < this.no_lights; index++) {
            this.lightArray[index] = new Array();
            this.lightArray[index]['r'] = r;
            this.lightArray[index]['g'] = g;
            this.lightArray[index]['b'] = b;
            
        }
    }

    setRange(from, to, r, g, b){
        if(from<0) from=0;
        if(to>this.lightArray.length) to=this.lightArray.length;

        for (let index = from; index < to; index++) {  
            this.lightArray[index]['r'] = r;
            this.lightArray[index]['g'] = g;
            this.lightArray[index]['b'] = b;
        }
    }

    toString(){
        var lightString = "";
        for (let index = 0; index < this.lightArray.length; index++) {
            lightString = `${lightString} "${index}r": "${this.lightArray[index]['r']}", "${index}g":"${this.lightArray[index]['g']}", "${index}b":"${this.lightArray[index]['b']}"`;
            if(index!=this.lightArray.length-1){
                lightString = lightString + ", ";
            }
        }
        return lightString;
    }

}


module.exports = lightRing;