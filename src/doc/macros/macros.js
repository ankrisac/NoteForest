const MacroList = {
    macros: {
        root: (tree, state) => MacroEval.join_recurse(tree, state),
    
        default: (tree, _) => MacroEval.join_literal(tree, ""),
        text: (tree, _) => MacroEval.join_literal(tree),

        h: (tree, state) => 
            wrap_elem("h1", MacroEval.join_literal(tree)),
        title: (tree, state) => {
            state.doc.title = MacroEval.join_literal(tree).trim();
            return "";
        },
        thumbnail: (tree, state) => {
            state.doc.thumbnail = MacroEval.join_literal(tree).trim();
            return "";
        },

        p: (tree, state) => MacroEval.wrap_elem("p", MacroEval.join_recurse(tree, state)),
        
        math: (tree, _) => MacroEval.math_render(MacroEval.join_literal(tree)),
        math_inline: (tree, _) => MacroEval.math_render(MacroEval.join_literal(tree), true),
        math_block: (tree, _) => 
            MacroEval.math_render(`\\begin{aligned}${
                MacroEval.join_literal(tree, "\\\\")}\\end{aligned}`),

        diagram: MacroDiagram.macro,
        circuit: (a, b) => "Error: defined only in diagram!"
    }
};