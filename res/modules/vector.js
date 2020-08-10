import * as Util from "./util.js";

class Vector{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    distSq(other){
        return Math.pow(this.x - other.y, 2) + Math.pow(this.y - other.y, 2);
    }
    dist(other){
        return Math.sqrt(this.distSq(other));
    }
    
    add(other){
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    add_mul(other, val){
        this.x += val * other.x;
        this.y += val * other.y;
        return this;
    }
    copy(){
        return new Vector(this.x, this.y);
    }
    map(fn){
        return new Vector(fn(this.x), fn(this.y));
    }
};

class Renderer{
    constructor(context){
        this.ctx = context;
    }

    thickness(width){
        this.ctx.lineWidth = width;
        return this;
    }
    stroke(color){
        this.ctx.strokeStyle = color;
        return this;
    }
    fill(color){
        this.ctx.fillStyle = color;
        return this;
    }

    font(font, R){
        this.ctx.font = `${R}px ${font}`;
        return this;
    }
    text(text, P){
        this.ctx.beginPath();
        this.ctx.fillText(text, P.x, P.y);
        this.ctx.stroke();
        return this;
    }

    line(A, B){
        this.ctx.beginPath();
        this.ctx.moveTo(A.x, A.y);
        this.ctx.lineTo(B.x, B.y);
        this.ctx.stroke();
        return this;
    }
    disc(P, R, solid = true){
        this.ctx.beginPath();
        this.ctx.ellipse(P.x, P.y, R, R, 0, 0, 2 * Math.PI);
        if(solid){
            this.ctx.fill();
        }
        else{
            this.ctx.stroke();
        }
        return this;
    }

    getPixel(P){
        let imgData = this.ctx.getImageData(P.x, P.y, 1, 1);
        let [r, g, b, _] = imgData.data;
        return Util.rgba(r, g, b);
    }
}

function make(x, y){
    return new Vector(x, y);
}
function fromPolar(angle, R = 1) {
    return new Vector(R * Math.cos(angle), R * Math.sin(angle));
}
export { Vector, Renderer, fromPolar, make};

