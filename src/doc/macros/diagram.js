const MacroCircuit = (() => {
    const component_macros = {
        sign: (_, state) => {
            state.sign = true;
            return "";
        },
        default: (tree, _) => tree.head + MacroEval.join_literal(tree, " ")
    }
    const binary_component = (macro_lst, fn) => {
        macro_lst[fn] = (tree, state) => {
            let comp_state = {
                sign: false,
                macros: component_macros,
            };

            let lst = MacroEval.join_recurse(tree, comp_state, " ").trim().split(" ");

            for(let i = 0; i + 1 < lst.length; i += 2){
                let [A, B] = [lst[i], lst[i + 1]];
        
                if(A in state.global.var && B in state.global.var){
                    let comp = state.circuit[fn](state.global.var[A], state.global.var[B]);
                    if(comp_state.sign){
                        comp.draw_signs();
                    }
                }
            }    
        };
    }
    const macro_list = {
        text: (tree, _) => MacroEval.join_literal(tree),

        AC: (_, state) => { state.circuit.AC = true; return ""; },
        animate: (_, state) => { state.circuit.anim = true; return ""; },
        default: (tree, _) => { return ""; }
    };
    [
        "ac_source", "cell", 
        "ground", "wire",

        "galvanometer", "ammeter", "voltmeter", 
        "resistor", "capacitor", "inductor",
        
        "diode", 
        "boxnode", "circlenode",
    ].map(x => binary_component(macro_list, x));

    return {    
        macro: (tree, locals) => {
            let state = {
                global: locals,
                macros: macro_list,
                circuit: new CircuitDiagram.Diagram()
            };

            MacroEval.join_recurse(tree, state);
            return state.circuit.to_svg();
        }
    };
})();
const MacroDiagram = (() => {
    const split_lhs = x => x.split(" ").filter(x => x.length > 0);

    const eval_equation = (data, state) => {
        let eq = data.split("=");
        if(eq.length >= 2){
            let rhs = eq.pop().trim();
            let lhs = eq.map(split_lhs);
            let val;

            try{
                val = VecParser.eval_expr(rhs, state.global.var);
            }
            catch(ex){
                return ex;
            }

            for(let grp of lhs){
                for(let i = 0; i < grp.length && val.length; i++){
                    let name = grp[i];
                    if(name === '_'){
                        state.global.var[name] = val[i];
                    }
                    else if(!(name in state.global.var)){
                        state.global.var[name] = val[i];
                    }
                    else{
                        return `Redeclaration of ${name} in ${grp} in ${lhs}`;
                    }
                }
            }
        }
        return "";
    }
    const macro_let = {    
        text: (tree, state) => 
            eval_equation(MacroEval.join_literal(tree), state),
        default: MacroEval.join_literal
    };

    const macro_line = {
        text: (tree, state) => {
            let data = MacroEval.join_literal(tree, state, " ").split(" ");

            switch(data.length){
                case 2:
                    data = data.map(x => state.global.var[x]);
                    if(data.every(x => x instanceof Vector.Complex)){
                        state.global.diagram.line(...data);        
                    }
                    break;
                case 1:
                case 0:
                    return `Line: Requires atleast 2 argument`
                default:
                    data = data.map(x => state.global.var[x]);
                    if(data.every(x => x instanceof Vector.Complex)){
                        state.global.diagram.polygon(data).style_set(
                            { 
                                join: true, 
                                close: false 
                            }
                        );
                    }
                    break;
            }
        },
        default: MacroEval.join_literal
    }

    const environment = (macro_lst) => 
        (tree, state) => {
            let local_state = {
                global: state, 
                macros: macro_lst
            };
            return MacroEval.join_recurse(tree, local_state);    
        };

    const macro_list = {
        let: environment(macro_let),
        line: environment(macro_line),
        arc: (tree, state) => {
            const lst = MacroEval.join_literal(tree, " ")
                .trim().split(" ")
                .filter(x => !/^\s*$/.test(x));

            for(let i = 0; i + 1 < lst.length; i += 2){
                const [P, R] = [lst[i], lst[i + 1]];

                if(P in state.var && R in state.var){
                    state.diagram.arc(state.var[P], state.var[R]);
                }
            }
            return "";    
        },
        circuit: MacroCircuit.macro,
        default: (tree, _) => { return ""; }
    }
    return {
        macro: (tree, _) => {
            let state = {
                var: {
                    e: new Vector.Complex(Math.E, 0),
                    pi: new Vector.Complex(Math.pi, 0)
                },
                macros: macro_list,
                diagram: new Diagram.Diagram()
            };

            let err = MacroEval.join_recurse(tree, state).trim();
            if(err.length != 0){
                return "Error: " + err;           
            }
            else{
                return state.diagram.render_svg();
            }
        }
    };
})();