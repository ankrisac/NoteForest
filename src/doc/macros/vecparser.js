const VecParser = (() => {
    const RE = {
        vec: /\[([\d.]+)([,;])([\d.]+)\]/,
        num: /([\d.]+)([ij])?/, 
        op: /([+\^\-*\/\(\)])/,
        space: /([\s]+)/,
        sym: /([^\s\d.\(\)\{\}\[\]]+)/
    }
    let lst = [RE.space, RE.vec, RE.num, RE.op, RE.sym];
    const re = new RegExp(lst.map(x => x.source).join("|"), "gmy");
    
    const tokenize = data => data.matchAll(re);

    const sym_table = {
        "+": [1, 2, (x, y) => y.cadd(x)],
        "-": [2, 2, (x, y) => y.csub(x)],
        "*": [3, 2, (x, y) => y.cmul(x)],
        "/": [3, 2, (x, y) => x.cdiv(y)],

        "u-": [4, 1, x => -x]
    };
    const get_prec = sym => {
        if(sym in sym_table){
            return sym_table[sym][0];
        }
        return 0;
    };

    const make_vec = (x, y, type) => {
        let [A, B] = [Number(x).valueOf(), Number(y).valueOf()]

        return (type === ",") ? Vector.make(A, B) : Vector.fromPolar(2 * Math.PI * B, A);
    }
    const make_num = (data, comp) => 
        (comp === undefined) ?
            Vector.make(Number(data).valueOf(), 0) :
            Vector.make(0, Number(data).valueOf());

    const shunting = (data, locals) => {
        let matches = tokenize(data);

        let result = [];
        let opstack = [];

        let prev_op = true;

        for(const token of matches){
            let [vec_x, vec_type, vec_y, num, num_comp, op, sym] = token.slice(2, 9);
            if(op !== undefined){
                switch(op){
                    case "(":
                        opstack.push(op);
                        break;
                    case ")":
                        while(true){
                            let top = opstack.pop();

                            if(top === undefined){
                                break;
                            }
                            if(top === "("){
                                break;
                            }
                            result.push(top);
                        }
                        break;
                    default: {
                        while(true){
                            let top = opstack.pop();
                            
                            if(top === undefined){ break; }
                            if(top === "("){
                                opstack.push(top);
                                break;
                            }
                            else if(get_prec(top) > get_prec(op)){
                                result.push(top)
                            }
                            else{
                                opstack.push(top);
                                break;
                            }
                        }
                        if(prev_op){
                            switch(op){
                                case "+": break; //Ignore
                                case "-": opstack.push("u-"); break;
                                default: opstack.push(op);
                            }
                        }
                        else{
                            opstack.push(op);
                        }
                        break;
                    }
                }
                prev_op = true;
            }
            else{
                if(vec_x !== undefined){
                    result.push(make_vec(vec_x, vec_y, vec_type));
                }
                if(num !== undefined){
                    result.push(make_num(num, num_comp));   
                }
                else if(sym !== undefined){  
                    if(sym in sym_table){
                        result.push(sym);
                    }
                    else if(sym in locals){
                        result.push(locals[sym]);
                    }
                    else{
                        throw `Undefined symbol ${sym}`
                    }
                }
                prev_op = false;    
            }
        }
    
        return result.concat(opstack.reverse());
    }
    const RPN_eval = RPN => {
        const stack = [];
        while(true){
            let top = RPN.shift();

            if(top == undefined){
                break;
            }
            if(typeof top === 'string'){
                let [_, n_args, fn] = sym_table[top]
                let args = stack.splice(-n_args);
                try{
                    stack.push(fn(...args));
                }
                catch(ex){
                    throw `Invalid arguments in [${top}] ${ex}`
                }
            }
            else{
                stack.push(top);
            }
        }
        return stack.shift();
    } 
    return {
        eval_expr: (data, locals) => 
            [RPN_eval(shunting(data, locals))]
    };
})();
