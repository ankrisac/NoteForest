const MacroEval = (() => {
    const is_string = tree => 
        (typeof tree === "string" || tree instanceof String);
        
    const tree_eval = (tree, state) => 
        is_string(tree) ? tree : 
            state.macros[
                (tree.head in state.macros) ? tree.head : "default"
            ](tree, state);
        
    const join_literal =(tree, sep = "") => 
        is_string(tree) ? tree : 
            tree.data.map(elem => join_literal(elem)).join(sep);
            
    const join_recurse = (tree, state, sep = "") =>
        is_string(tree) ? tree :
            tree.data.map(elem => tree_eval(elem, state)).join(sep);

    const wrap_elem = (elem, inner, prop = "") => 
        `<${elem} ${prop}>${inner}</${elem}>`;
        
    const wrap_style = (class_name, inner) => 
        wrap_elem("div", inner, `class=${class_name}`);
    const KatexMacros = {
        RR: "\\mathbb{R}"
    };
        
    const math_render = (text, inline = false) => {
        try{
            return katex.renderToString(text, 
                {
                    throwOnError: false,
                    displayMode: !inline,
                    macros: KatexMacros
                }
            )     
        }
        catch{
            return wrap_style("output_ln_error", text);
        }
    };
    return {
        is_string: is_string,
        tree_eval: tree_eval, 
        join_literal: join_literal,
        join_recurse: join_recurse,
        wrap_elem: wrap_elem,
        wrap_style: wrap_style,
        math_render: math_render
    }
})();