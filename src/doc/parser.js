const Parser = (() => {
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

    const print_tree = (tree, indent = 0) => 
        "  ".repeat(indent) + 
        (is_string(tree) ?
            `${tree}\n` : 
            `${tree.head}:\n${
                tree.data.map(elem => 
                    print_tree(elem, indent + 1)).join("")
            }`);

    const apply_syntax_ln = match => {
        let mac = match.substring(0, match.length - 1);
        return MacroEval.wrap_style(`editor_ln_head${(mac.trim() in MacroList.macros) ? "" : "_undef"}`, mac)
        + MacroEval.wrap_style("editor_ln_sep", ":");
    }
        
    const is_comment = ln => /^[ \t]*--/.test(ln);
    const apply_syntax = ln => 
        is_comment(ln) ?
            MacroEval.wrap_style("editor_ln_comment", ln) :
                ln.replace(/[^:]*:/, apply_syntax_ln);

    const wrap_line = expr => 
        MacroEval.wrap_style("editor_ln", apply_syntax(expr)) + "\n";

    return {
        eval_doc: input => {
            let state = {
                doc: {
                    title: "",
                    thumbnail: "",
                },
                macros: MacroList.macros
            }
            let tree = parse_tree(new ParseIter(input));
            state.doc.data = MacroEval.tree_eval(tree, state);
            return state.doc;    
        },

        highlight: input => 
            (' ' + input).slice(1)
                .split('\n').map(wrap_line).join("")
    }
})();