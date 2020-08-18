const Diagram = (() => {
    const round = (val, k = 1000) => Math.round(val * k) / k; 
    const mod = (x, y) => (x % y + y) % y;
    const mod_rad = angle => mod(angle, 2 * Math.PI);
    const fromRadians = rad => 180 / Math.PI * rad;

    class Element{
        constructor(diagram){
            this.diagram = diagram;
            this.style = {
                fill: false,
                visible: true,
                width: 1.25, 
                join: false,
                close: false,
            };
        }

        style_set(attr_dict){
            for(const attr in attr_dict){
                this.style[attr] = attr_dict[attr];
            }
            return this;
        }
        hide(){
            return this.style_set({ visible: false });
        }
        svgCoord(V){
            return `${round(V.x * this.diagram.scale)},${round(V.y * this.diagram.scale)}`;
        }
        to_svg(){
            let style = "";
            if(this.style.class != undefined){
                style += ` class="${this.style.class}"`;
            }
            style += " " + (this.style.fill ? `fill="black"` : `fill="none"`);
            style += ` stroke-width = "${4 * this.style.width}"`;

            let transform = "";
            
            if(this.style.rot != undefined){
                let angle = round(180 / Math.PI * this.style.rot);

                let origin = "";
                if(this.style.O != undefined){
                    origin = `,${this.svgCoord(this.style.O)}`;
                }

                transform += `rotate(${angle}${origin})`;
            }
            if(transform != ""){
                transform = `transform="${transform}"`;
            }

            style += ` shape-rendering="geometricPrecision"`;
            
            return `<path ${style} ${transform}d="${this.svg_data()}"/>`;    
        }
    }
    class Text extends Element{
        constructor(diagram, P, text){
            super(diagram);
            this.P = P;
            this.text = text;
        }   
        to_svg(){
            let x = `x="${round(this.P.x * this.diagram.scale)}"`
            let y = `y="${round(this.P.y * this.diagram.scale)}"`;
            
            let style = "";
            if(this.style.class != undefined){
                style += `class="text ${this.style.class}"`;
            }
            else{
                style += `class="text"`;
            }

            return `<text ${x} ${y} ${style}>${this.text}</text>`;
        }
    }

    const filter_type = (lst, Class, err_msg) => {
        for(let elem of lst){
            if(!(elem instanceof Class)){
                throw err_msg;
            }
        }
        return lst;
    }
    class PathElement extends Element{
        constructor(diagram){
            super(diagram);
        }
    }
    class Line extends PathElement{
        constructor(diagram, A, B){
            super(diagram);
            [this.A, this.B] = filter_type([A, B], Vector.Complex, "Line expected Complex Number!");
        }

        svg_data(){
            return `M${this.svgCoord(this.A)} L${this.svgCoord(this.B)}`;
        }
    }

    class Arc extends PathElement{
        constructor(diagram, P, R, arc_angle){
            super(diagram);
            this.P = P;
            this.R = R;
            this.arc = arc_angle;
        }

        svg_data(){
            const rot = Vector.fromPolar(this.arc.rot);

            const I = rot.cmul(Vector.make(this.R.x, 0));
            const J = rot.cmul(Vector.make(0, this.R.y));
            const [a0, a1] = [this.arc.begin, this.arc.end];

            const apply = V => this.svgCoord(this.P.cadd(V));

            if(a1 - a0 < 2 * Math.PI){
                let K = (mod_rad(a1 - a0) > Math.PI) ? "1 1" : "0 1";

                const A = I
                    .cscl(Math.cos(a0))
                    .add_mul(Math.sin(a0), J);
                    
                const B = I
                    .cscl(Math.cos(a1))
                    .add_mul(Math.sin(a1), J);
                    
                let r = fromRadians(this.arc.rot)

                const radii = `A${this.svgCoord(this.R)} ${r} ${K}`
                return `M${apply(A)} ${radii} ${apply(B)}`;            
            }
            else{
                let A = `${apply(I)}`;
                let R = `${this.svgCoord(this.R)}`
                let r = fromRadians(this.arc.rot);
                let B = `${apply(I.cscl(-1))}`;

                return `M${B} A${R} ${r} 0 1 ${A} M${A} A${R} ${r} 0 1 ${B}`;
            }
        }
    }


    class Polygon extends PathElement{
        constructor(diagram, lst){
            super(diagram);
            this.lst = filter_type(lst, Vector.Complex, "Polygon expected Complex!");
        }

        svg_data(){
            let data = "";
            if(this.lst.length > 0){
                data += `M${this.svgCoord(this.lst[0])} `;
                data += this.lst.map(x => "L" + this.svgCoord(x)).join(" ");
                data += this.style.close ? "Z" : "";
            }        
            if(this.style.join){
                data = data.replace(/M/g, 'L');
                data = data.replace(/L/, 'M');
            }
            return data;
        }
    }

    class Figure extends PathElement {
        constructor(diagram, lst){
            super(diagram);
            this.lst = filter_type(lst, PathElement, "Figure expected PathElement!");
        }
        svg_data(){
            let data = "";
            if(this.lst.length > 0){
                data += this.lst.map(x => x.svg_data()).join(" ");
                data += (this.style.close ? "Z" : "");
            }
            if(this.style.join){
                data = data.replace(/M/g, 'L');
                data = data.replace(/L/, 'M');
            }

            return data;
        }
    }


    class Diagram{
        constructor(){
            this.stack = [];

            this.scale = 200;
            this.dim = Vector.make(10, 10);
        }

        construct(Cons, args){
            let out = new Cons(this, ...args);
            this.stack.push(out);
            return out;
        }

        text(P, text, style = {}){ return this.construct(Text, [P, text, style]); }
        line(A, B){ return this.construct(Line, [A, B]); }
        arc(P, R, arc_angle = { rot: 0, begin: 0, end: 2 * Math.PI }){ 
            return this.construct(Arc, [P, R, arc_angle]);
        }
        circle(P, r, arc_angle = { rot: 0, begin: 0, end: 2 * Math.Pi}){
            return this.arc(P, Vector.make(r, r), arc_angle);
        }

        polygon(lst){ return this.construct(Polygon, [lst]); }
        figure(lst){ return this.construct(Figure, [lst]); }
        
        style(){
            return `
                .text { 
                    text-anchor: middle; 
                    dominant-baseline: central;

                    font: ${this.scale/3}px sans-serif; 
                    font-family: 'Recursive', sans-serif;
                    font-weight: 100;

                    fill: white;
                } 
            `;    
        }
        render_svg(){ 
            let [w, h] = [this.dim.x, this.dim.y];

            let data = this.stack
                .filter(x => x.style.visible)
                .map(x => "  " + x.to_svg())
                .join("\n");

            let vbox = `viewbox="0 0 ${w * this.scale} ${h * this.scale}"`;
            let dim = `width="100%" height="100%"`

            let style = `<style> ${this.style()} </style>`;
            let out = `<svg stroke="white" ${vbox} ${dim}>${style}\n${data}\n</svg>`;
            return out;
        }
    }
    return {
        Diagram: Diagram
    }
})();
