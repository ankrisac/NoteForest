const Vector = (() => {
    class Complex{
        constructor(real = 1, imag = 0){
            this.x = real;
            this.y = imag;
        }
        copy(){ return new Complex(this.x, this.y); }
    
        set re(val){ this.x = val; }
        set im(val){ this.y = val; }
    
        get re(){ return this.x; }
        get im(){ return this.y; }
    
        conj(){ 
            this.y = -this.y; 
            return this;
        }
    
        add_mul(val, other){ 
            this.x += val * other.x;
            this.y += val * other.y
            return this;
        }
        add(other){
            this.x += other.x;
            this.y += other.y;
            return this;
        }
        sub(other){
            this.x -= other.x;
            this.y -= other.y;
            return this;
        }
        cadd_mul(val, other){ return this.copy().add_mul(val, other); }
        cadd(other){ return this.copy().add(other); }
        csub(other){ return this.copy().sub(other); }

        map(fn){
            this.x = fn(this.x);
            this.y = fn(this.y);
            return this;
        }
        cmap(fn){ return this.copy().map(fn); }

        scl(val){
            this.x *= val;
            this.y *= val;
            return this;
        }
        cscl(val){ return this.copy().scl(val); }

        inner(other){ return this.x * other.x + this.y * other.y; }
        magSq(){ return this.x * this.x + this.y * this.y; }
        mag(){ return Math.sqrt(this.magSq()); } 
        unit(){ 
            let mag = this.mag();
            return (mag != 0) ? this.scl(1/mag) : new Complex();
        }

        angle(){ return Math.atan2(this.y, this.x); }
        cmul(other){
            return new Complex(
                this.x * other.x - this.y * other.y,
                this.x * other.y + this.y * other.x
            );
        }
        cdiv(other){
            return this.cmul(other.copy().conj())
                .scl(1/other.magSq());
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
            let U = A.csub(B).unit().cmul(new Complex(0, w));
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
    
    return {
        Complex: Complex,
        Renderer: Renderer,
        make: (x, y) => new Complex(x, y),
        fromPolar: (angle, R = 1) =>   
            new Complex(R * Math.cos(angle), R * Math.sin(angle))
    } 
})();
