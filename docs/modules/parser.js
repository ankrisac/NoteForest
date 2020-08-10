class ParseIter{
    constructor(stream){
        this.stream = stream;
        this.pos = 0;
    }

    end(){
        return this.pos >= this.stream.length;
    }
    next(){
        if(this.pos < this.stream.length){
            this.pos++;
            return true;
        }
        return false;
    }
    peek(n = 0){
        let N = this.pos + n;
        if(0 <= N && N < this.stream.length){
            return this.stream[N];
        }
        return null;
    }
    pop(){
        let chr = this.peek();
        this.next();
        return chr;
    }
}

const parse_space = it => {
    let space = 0;

    while(it.peek() === " "){    
        space++;
        it.next();
    }
    return space;
};

const parse_line = it => {
    const ln_filter = name => name.length > 0 && name.substring(0, 2) != "--";
    
    let name = "";
    for(let chr; (chr = it.peek()) != ":"; it.next(), name += chr){
        if(chr === null || chr === "\n"){
            return ln_filter(name) ? ["text", name] : null;
        }
    }

    let data = "";
    for(let chr; (chr = it.peek()) != null && chr != "\n"; it.next(), data += chr);

    return ln_filter(name) ? [name.trim(), data.slice(1)] : null;
};

const parse_tree = it => {
    let tree = { parent: null, head: "root", data: [] };
    const indents = [0];

    while(it.peek() != null){
        while(it.peek() === "\n"){ it.next(); }

        const space = parse_space(it);
        const ln = parse_line(it);

        if(ln === null){ continue; }

        let [ln_head, ln_data] = ln;
        if(ln_head === ""){ continue; }

        if(space === indents[indents.length - 1]){
            tree.data.push({ 
                parent: tree, 
                head: ln_head, 
                data: [ln_data]
            });
        }
        else if(space > indents[indents.length - 1]){
            if(tree.data.length > 0){
                indents.push(space);

                tree = tree.data[tree.data.length - 1];
                tree.data.push({
                    parent: tree,
                    head: ln_head,
                    data: [ln_data] 
                });
            }
        }
        else{
            while(space < indents[indents.length - 1]){
                indents.pop();
                tree = tree.parent;
            }
            
            tree.data.push({ 
                parent: tree, 
                head: ln_head, 
                data: [ln_data],
            });
        }
    }

    while(tree.parent != null){ tree = tree.parent; }
    return tree;
};

const is_string = tree => 
    (typeof tree === "string" || tree instanceof String);

const tree_eval = (tree, state) => 
    is_string(tree) ? tree : 
        ((tree.head in state.macros) ? 
            state.macros[tree.head](tree, state) : 
            join_literal(tree, ""));

const join_literal = (tree, sep = "") => 
    is_string(tree) ? tree : 
        tree.data.map(elem => join_literal(elem)).join(sep);

const join_recurse = (tree, state) =>
    is_string(tree) ? tree :
        tree.data.map(elem => tree_eval(elem, state)).join("");

const wrap_elem = (elem, inner, prop = "") => 
    `<${elem} ${prop}>${inner}</${elem}>`
const wrap_style = (class_name, inner) => 
    wrap_elem("div", inner, `class=${class_name}`);

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
    
const KatexMacros = {
    RR: "\\mathbb{R}"
};

const GMacros = {
    root: (tree, state) => join_recurse(tree, state),
    
    h: (tree, state) => 
        wrap_elem("h1", join_literal(tree)),
    title: (tree, state) => {
        state.doc.title = join_literal(tree).trim();
        return "";
    },
    thumbnail: (tree, state) => {
        state.doc.thumbnail = join_literal(tree).trim();
        return "";
    },

    p: (tree, state) => wrap_elem("p", join_recurse(tree, state)),
    text: (tree, _) => join_literal(tree),

    math: (tree, _) => math_render(join_literal(tree)),
    math_inline: (tree, _) => math_render(join_literal(tree), true),
    math_block: (tree, _) => 
        math_render(`\\begin{aligned}${
            join_literal(tree, "\\\\")}\\end{aligned}`),

    canvas: (tree, state) => {

    }
};


const print_tree = (tree, indent = 0) => 
    "  ".repeat(indent) + 
    (is_string(tree) ?
        `${tree}\n` : 
        `${tree.head}:\n${
            tree.data.map(elem => 
                print_tree(elem, indent + 1)).join("")
        }`);

const eval_doc = input => {
    let state = {
        doc: {
            title: "",
            thumbnail: "",
        },
        macros: GMacros
    }
    let tree = parse_tree(new ParseIter(input));
    state.doc.data = tree_eval(tree, state);
    return state.doc;    
};

const apply_syntax_ln = match => {
    let mac = match.substring(0, match.length - 1);
    return wrap_style(`editor_ln_head${(mac.trim() in GMacros) ? "" : "_undef"}`, mac)
    + wrap_style("editor_ln_sep", ":");
}
    
const is_comment = ln => /^[ \t]*--/.test(ln);
const apply_syntax = ln => 
    is_comment(ln) ?
        wrap_style("editor_ln_comment", ln) :
            ln.replace(/[^:]*:/, apply_syntax_ln);

const highlight = input => 
    (' ' + input)
        .slice(1)
        .replace(/\n\n/g, "\n")
        .replace(/([^\n]*)([\n]|$)/g, 
            (match, p1, p2) => 
                wrap_style("editor_ln", apply_syntax(p1)) + "\n");
        
export { eval_doc, highlight };