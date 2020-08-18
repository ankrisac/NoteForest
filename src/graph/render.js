class ColorID_Generator{
    constructor(N){
        this.part = [0,0,0];
        this.N = N;
    }
    next_ID(){
        this.part[0]++;

        for(let i = 0; i < this.part.length - 1; i++){
            if(this.part[i] >= this.N){
                this.part[i] = 0
                this.part[i + 1] += 1;
            }
        }

        let N = this.part.length;
        if(this.part[N - 1] >= this.N){
            this.part[N - 1] = 0;
            this.part[0] = 1; //Range ID = 1 -> 3^N - 1
        }
        
        return this.part;
    }
}
class Renderer{
    constructor(display_context,  pointer_context){
        this.dctx = new Vector.Renderer(display_context);
        this.pctx = new Vector.Renderer(pointer_context);
        
        this.encode = {
            gen: new ColorID_Generator(16),
            val: {}
        };
    }

    thickness(width){
        this.dctx.thickness(width);
        return this;
    }
    stroke(color){
        this.dctx.stroke(color);
        return this;
    }
    text(text, P){
        this.dctx.text(text, P);
    }
    fill(color){
        this.dctx.fill(color);
        return this;
    }
    font(R, font){
        this.dctx.font(R, font);
        return this;
    }

    encode_col(){
        let N = 256;
        let k = Math.floor(N / this.encode.gen.N);
        let [r, g, b] = this.encode.gen.next_ID();
        return Util.rgba(
            (r * k) % N, (g * k) % N, (b * k) % N);
    }
    encode_obj(ref){
        let col = this.encode_col();
        this.encode.val[col] = ref;
        return col;
    }
    touch(P){
        let col = this.pctx.getPixel(P);
        
        if(col in this.encode.val){
            return this.encode.val[col];
        }

        return null;
    }

    draw_node(P, r, ref){
        let col = this.encode_obj(ref);

        this.pctx
            .thickness(0)
            .fill(col)
            .disc(P, 1.5 * r);

        this.dctx
            .thickness(0)
            .fill(Util.rgba(200))
            .disc(P, r)          
            .fill(Util.rgba(0))
            .text(
                ref.data.thumbnail, 
                P.copy().add(Vector.make(0, 0.1 * r)));

        return this;
    }
    draw_node_outline(P, r){
        this.dctx
            .thickness(r * 0.2)
            .disc(P, 1.25 * r, false);
        return this; 
    }

    draw_link(r, A, B, taper, ref){
        let col = this.encode_obj(ref);

        this.pctx
            .thickness(0.8 * r)
            .stroke(col)
            .line(A, B);

        this.dctx
            .fill(Util.rgba(160))
            .line_taper(A, B, taper * r);

        return this;
    }
    draw_link_hover(r, A, B, taper){
        return this.dctx
            .fill(Util.rgba(120, 80, 140))
            .line_taper(A, B, taper * r);
    }
    draw_link_active(r, A, B, taper){
        this.dctx
            .fill(Util.rgba(120, 80, 140))
            .line_taper(A, B, taper * r);

        return this
            .stroke(Util.rgba(160, 40, 160))
            .draw_node_outline(B, r);
    }
};

export { Renderer };