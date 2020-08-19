importScripts(
    '../util/util.js',
    '../util/vector.js',
    
    'diagram/core.js',
    'diagram/circuit.js',

    'macros/macro_eval.js',
    'macros/vecparser.js',
    'macros/diagram.js',
    'macros/macros.js',

    'parser.js',
    "https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.js"
);

let i = 0;
onmessage = event => {
    const [text, delay] = event.data;
    const doc = Parser.eval_doc(text);
    
    if(delay > 0){
        setTimeout(() => {
            postMessage(doc);
        }, delay);    
    }
    else{
        postMessage(doc);
    }
};