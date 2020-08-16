import * as Util from "./util.js";

class Vector{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    dot(other){ return this.x * other.x + this.y * other.y; }
    magSq(){ return this.dot(this); }
    mag(){ return Math.sqrt(this.magSq()); }

    distSq(other){ return this.copy().sub(other).magSq(); }
    dist(other){ return this.copy().sub(other).mag(); }

    add_mul(other, val){
        this.x += val * other.x;
        this.y += val * other.y;
        return this;
    }
    add(other){ return this.add_mul(other, 1); }
    sub(other){ return this.add_mul(other, -1); }
    scl(val){
        this.x *= val;
        this.y *= val;
        return this;
    }
    copy(){ return new Vector(this.x, this.y); }
    map(fn){ return new Vector(fn(this.x), fn(this.y)); }

    unit(){ return this.copy().scl(1/this.mag()); }
    mul(other){
        return new Vector(
            this.x * other.x - this.y * other.y,
            this.x * other.y + this.y * other.x
        );
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
    line_dash(segments){
        this.ctx.setLineDash(segments);
        return this;
    }

    font(R, font){
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
    line_taper(A, B, w){
        let U = A.copy().sub(B).unit().mul(new Vector(0, w));
        let k = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(A.x - k * U.x, A.y - k * U.y);
        this.ctx.lineTo(A.x + k * U.x, A.y + k * U.y);
        this.ctx.lineTo(B.x + U.x / k, B.y + U.y / k);
        this.ctx.lineTo(B.x - U.x / k, B.y - U.y / k);
        this.ctx.closePath();
        this.ctx.fill();
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
