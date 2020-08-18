const CircuitDiagram = (() => {
    class Node {
        constructor(circuit, A, B, width = 1){
            this.is_source = false;

            this.circuit = circuit;
            [this.A, this.B] = [A, B];

            this.X = A.cadd(B).scl(0.5);
            this.width = width;
            
            this.i = B.csub(A).unit().scl(0.5);
            this.j = Vector.make(0, 1).cmul(this.i);

            this.a = this.X.cadd_mul(-this.width, this.i);
            this.b = this.X.cadd_mul(+this.width, this.i);
        }

        draw_box(h = 1){
            this.circuit.polygon(
                [
                    this.a.cadd_mul(h, this.j),
                    this.b.cadd_mul(h, this.j),
                    this.b.cadd_mul(-h, this.j),     
                    this.a.cadd_mul(-h, this.j),
                ]
            ).style_set({ close: true }); 
        }

        draw_sym(V, dx, dy, sym, Class){
            this.circuit.text(
                V.cadd_mul(dy, this.j)
                .add_mul(dx, this.i), sym
            ).style_set({ class: Class });
        }
        __draw_polarity(dx, dy, left_sym, right_sym, Class){
            this.draw_sym(this.a, -dx, dy, left_sym, Class)
            this.draw_sym(this.b, +dx, dy, right_sym, Class)
        }
        draw_signs(dy = -0.3, dx = 0.4){
            const dir = sign => sign ? "flow_forward" : "flow_backward";

            this.__draw_polarity(dx, dy, "+", "-", dir(!this.source));
            this.__draw_polarity(dx, dy, "-", "+", dir(this.source));
        }
        draw_varline(){
            this.circuit.line()
        }
    };
    class Wire extends Node {
        constructor(circuit, A, B){
            super(circuit, A, B, 0);

            this.circuit.line(this.A, this.B).style_set({ class: "wire" });
        }
    }
    class Component extends Node{
        constructor(circuit, A, B, width = 1){
            super(circuit, A, B, width);

            this.circuit.line(this.A, this.a).style_set({ class: "wire" });
            this.circuit.line(this.b, this.B).style_set({ class: "wire" });;
        }
    }

    class Cell extends Component{
        constructor(circuit, A, B){
            super(circuit, A, B, 0.2);
            this.is_source = true;
        
            let k = 0.3;
            this.circuit.line(this.a.cadd_mul(k, this.j), this.a.cadd_mul(-k, this.j));
            this.circuit.line(this.b.cadd(this.j), this.b.csub(this.j));   
        }
        draw_signs(dy = -0.3, dx = 0.4){
            this.__draw_polarity(dx, dy, "-", "+", "");
        }
    }

    class Capacitor extends Component{
        constructor(circuit, A, B, polarized_angle = 0.4){
            super(circuit, A, B, 0.2);
            
            let r = 0.5/Math.tan(0.5 * polarized_angle);
            let P = this.a.cadd_mul(-r, this.i);
            let R = Vector.make(1,1).scl(0.5 * r);

            this.circuit.arc(P, R, { 
                rot: this.i.angle(), 
                begin: -polarized_angle, 
                end: +polarized_angle 
            });
            this.circuit.line(this.b.cadd(this.j), this.b.csub(this.j));
        }
    };
    class Resistor extends Component{
        constructor(circuit, A, B, N = 1){
            let K = 8;
            let n = N * K;

            let k = 1 / K;
            super(circuit, A, B, k * n);
            
            let a = this.a.copy();

            let I = this.i.cscl(0.5 * k);
            let J = this.j.cscl(0.25);

            let lst = [];

            for(let i = 0; i < n; i++){
                lst.push(a.copy());
                lst.push(a.add(I).cadd(J));
                a.add(I);
                lst.push(a.add(I).csub(J));
                lst.push(a.add(I).copy());
            }

            this.circuit.polygon(lst).style_set({ class: "wire" });
        }
    }
    class Inductor extends Node{
        constructor(circuit, A, B, N = 1){
            let K = 8;
            let k = 1 / K;
            let n = N * K;

            super(circuit, A, B, N);
      
            this.circuit.line(this.A, this.B).style_set({ class: "wire" });
      
            
            let a = this.a.copy();

            let r0 = 0.3;
            let [I, dir] = [this.i.cscl(2 * k), this.i.angle()];
            
            let h = 1.4 * k;
            let r = Vector.make(r0 * k, 0.6 * h);
            let R = Vector.make((0.5 + r0) * k, h);
            
            let lst = [];
            for(let i = 0; i < n - 1; i++){
                lst.push(this.circuit.arc(a.cadd_mul(0.5, I), R,
                    { rot: dir, begin: Math.PI, end: 2 * Math.PI }    
                ).hide());

                a.add(I);
                lst.push(this.circuit.arc(a.copy(), r, 
                    { rot: dir, begin: 0, end: Math.PI }    
                ).hide());
            }
            lst.push(this.circuit.arc(a.cadd_mul(0.5, I), R,
                { rot: dir, begin: Math.PI, end: 2 * Math.PI }    
            ).hide());
            
            this.circuit.figure(lst).style_set({ class: "inductor_wire", join: true });
        }
    }

    class Diode extends Component{
        constructor(circuit, A, B){
            let k = 0.5;
            super(circuit, A, B, 0.5);

            this.circuit.polygon(
                [
                    this.a.cadd_mul(k, this.j), 
                    this.a.cadd_mul(-k, this.j),
                    this.b.copy(),
                    this.b.cadd_mul(-k, this.j),
                    this.b.cadd_mul(+k, this.j), 
                    this.b.copy(),
                ]
            ).style_set({ join: true, close: true });
        }
    }

    class CircleNode extends Component{
        constructor(circuit, A, B){
            let R = 0.3;
            super(circuit, A, B, 2*R);
            this.circuit.circle(this.X, R);
        }
    }
    class BoxNode extends Component {
        constructor(circuit, A, B, R = 1){
            super(circuit, A, B, R)
            this.draw_box(0.35);
        }
    }

    class Ground extends Component{
        constructor(circuit, A, B){
            if(B == undefined){
                B = Vector.make(0, 1).add(A);
            }
            super(circuit, A, B, 1);
            this.circuit.line(A, this.X).style_set({ class: "wire" });

            let X = this.X.copy();

            let k = 0.25;
            for(let i = 3; i > 0; i--){
                this.circuit.line(
                    X.cadd_mul(k * i, this.j), X.cadd_mul(-k * i, this.j));
                X.add_mul(0.25, this.i);
            }
        }
    }
    class Galvanometer extends CircleNode{
        constructor(circuit, A, B){
            super(circuit, A, B);
            this.circuit.text(this.X, "G");
        }
    }
    class Ammeter extends CircleNode{
        constructor(circuit, A, B){
            super(circuit, A, B);
            this.circuit.text(this.X, "A");
        }
    }
    class Voltmeter extends CircleNode{
        constructor(circuit, A, B){
            super(circuit, A, B);
            this.circuit.text(this.X, "V");
        }
    }
    class AC_Source extends CircleNode{
        constructor(circuit, A, B){
            super(circuit, A, B);
            this.is_source = true;

            let r = 0.1;
            let I = Vector.make(r, 0);
            
            this.circuit.circle(this.X.cadd(I), r, 
                { rot: 0, begin: 0, end: Math.PI }
            ).style_set({ class: "AC_source" });
            this.circuit.circle(this.X.csub(I), r, 
                { rot: 0, begin: Math.PI, end: 2 * Math.PI }
            ).style_set({ class: "AC_source" });
        }
    }

    class __Diagram extends Diagram.Diagram {
        constructor(){
            super();
            this.R = 1;

            this.anim = false;
            this.AC = false;
        }

        anim_style(){
            const anim_dc = type =>
                `animation: ${type} 2s linear infinite`;
            const anim_cap = type => 
                `animation: ${type} 60s ease-out infinite`;
            const anim_ac = type => 
                `animation: ${type} 4s ease-in-out infinite alternate;`        
        
            let anim = anim_dc;
            if(this.AC){
                anim = anim_ac;
            }

            anim_dc.style = `
                .flow_backward { opacity: 0; }
                @keyframes flow { 
                    to { stroke-dashoffset: -600; }
                }
            `;
            anim_cap.style = `
                .flow_backward { opacity: 0; }
                .flow_forward { ${anim("flow_pos")} }

                @keyframes flow { 
                    to { stroke-dashoffset: 21600; }
                }
                @keyframes flow_pos {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;

            anim_ac.style = `
                .flow_forward { ${anim("flow_pos")} }
                .flow_backward { ${anim("flow_neg")} }

                @keyframes flow { 
                    to { stroke-dashoffset: -600; }
                }
                @keyframes flow_pos {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes flow_neg {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;       

                
            return super.style() + `
                .wire {
                    stroke: white;
                    stroke-dasharray: 50 10;
            
                    ${anim("flow")}
                }
                .inductor_wire {
                    stroke: #9999FF;
                    stroke-dasharray: 50 10;

                    ${anim("flow")}
                    animation-delay: 1s;
                }
                ${anim.style}
            `;
        }
        style(){
            if(this.anim){
                return this.anim_style();
            }
            else{
                return super.style();
            }
        }

        new_comp(Class, args){
            return new Class(this, ...args);
        }

        ac_source(A, B){ return this.new_comp(AC_Source, [A, B]); }
        cell(A, B){ return this.new_comp(Cell, [A, B]); }
        
        ground(A, B){ return this.new_comp(Ground, [A, B]); }
        wire(A, B){ return this.new_comp(Wire, [A, B]); }

        capacitor(A, B){ return this.new_comp(Capacitor, [A, B]); }
        resistor(A, B, N = 1){ return this.new_comp(Resistor, [A, B, N]); }
        inductor(A, B, N = 1){ return this.new_comp(Inductor, [A, B, N]); }
        diode(A, B){ return this.new_comp(Diode, [A, B]); }

        boxnode(A, B){ return this.new_comp(BoxNode, [A, B]); }
        circlenode(A, B){ return this.new_comp(CircleNode, [A, B]); }

        galvanometer(A, B){ return this.new_comp(Galvanometer, [A, B]); }
        ammeter(A, B){ return this.new_comp(Ammeter, [A, B]); }
        voltmeter(A, B){ return this.new_comp(Voltmeter, [A, B]); }

        to_svg(){
            return "</g>\n" + this.render_svg() + "\n<g>"
        }
    };

    return {
        Diagram: __Diagram
    }
})();