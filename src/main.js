import * as Graph from "./graph/core.js";

document.execCommand("defaultParagraphSeparator", false, "br");

let canvas = {
    display: $("#canvas-display"),
    pointer: $("#canvas-pointer")
};
let context = {
    display: canvas.display.getContext("2d"),
    pointer: canvas.pointer.getContext("2d")
};
let graph = {
    tooltip: $("#graph_tooltip"),
    contextmenu: $("#graph_contextmenu"),
};
let node, renderer, graph_vistor;

const State = {
    change: true,

    keyboard: {
        shift: false,
        ctrl: false
    },
    mouse_state: { 
        pos: Vector.make(0, 0) 
    },

    scale: 1,
    edit: false,
    view: false,
};

const view = {
    view: $("#viewer"),
    out: $("#output"),
    inp: $("#editor")
};
const output = {
    title: $("#output_title"),
    data: $("#output_display")
}
const input = {
    syntax: $("#editor_syntax"),
    data: $("#editor_data")
};

const input_update = () => {
    graph_vistor.edited = true;
    DocWorker.updated = false;
    
    graph_vistor.node.data.data = input.data.innerText;
    update_viewer();
}
input.data.oninput = input_update;
input.data.onkeydown = event => {
    if(event.code === "Tab"){
        event.preventDefault();

        let range = document.getSelection().getRangeAt(0);
        
        let node = $.newText("  ");
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
    
        input_update();
    }
}

const sync_data = () => {
    input.data.innerText = graph_vistor.node.data.data;
};

if(!window.Worker){
    alert("This applet requires the Web Workers API, Please use a modern browser such as Chrome or Firefox");
}

const DocWorker = {
    delay: 0,
    updated: false,
    availabe: false,
};
DocWorker.make = () => {
    DocWorker.worker = new Worker("src/doc/worker.js");
    DocWorker.available = true;

    DocWorker.worker.onmessage = event => {
        let doc = event.data;
        graph_vistor.node.data.title = doc.title;
        graph_vistor.node.data.thumbnail = doc.thumbnail;

        output.title.innerText = 
            (doc.title.length > 0) ? doc.title : "Untitled Doc";
        output.data.innerHTML = doc.data;
        DocWorker.available = true;
        DocWorker.delay = 500;
    }
}
DocWorker.update_output = () => {
    if(DocWorker.available && !DocWorker.updated){
        DocWorker.available = false;
        DocWorker.worker.postMessage([
            input.data.innerText,
            DocWorker.delay
        ]);    
        DocWorker.updated = true;
    }
}
DocWorker.make();

const update_viewer = () => {
    let text = input.data.innerText;
    input.syntax.innerHTML = Parser.highlight(text);    
};
const reload_document = () =>{
    DocWorker.updated = false;
    DocWorker.delay = 0;
    sync_data();
    update_viewer();       
};

const class_swap = (elem, before, after, swap) => {
    if(swap){
        [after, before] = [before, after];
    }
    elem.classList.remove(before);
    elem.classList.add(after);
};

let width, height;
window.onresize = (() => {
    const resize = () => {
        let dpr = 1; //window.devicePixelRatio || 1;
        let pdpr = dpr;

        width = window.innerWidth;
        height = window.innerHeight;

        canvas.pointer.width = width * dpr;
        canvas.pointer.height = height * dpr;
        context.display.setTransform(dpr, 0, 0, dpr, 0, 0);

        canvas.display.width = width * pdpr;
        canvas.display.height = height * pdpr;
        context.display.setTransform(pdpr, 0, 0, pdpr, 0, 0);
        State.change = true;
    }
    resize();
    return resize;
})();

window.onkeyup = (event) => {
    switch(event.code){
        case "ShiftLeft": State.keyboard.shift = false; break;
    }  
};
window.onkeydown = event => {
    switch(event.code){        
        case "ShiftLeft": State.keyboard.shift = true; break;
        default: break;
    }  
    if(event.ctrlKey){
        let block = true;
        switch(event.code){
            case "KeyY": toggle_view(); break;
            case "KeyE": toggle_edit(); break;
            case "KeyS":
                XHR.request("POST", "$/data_save", 
                    graph_vistor.save()
                ).then(() => { 
                    graph_vistor.edited = false;
                    window.title = "NoteForest [Saved]";
                })
                .catch(() => { 
                    alert("Saving not supported!"); 
                });
                break;    
            default:
                block = false;
        }
        if(block){
            event.preventDefault();
        }
    }
};

window.onclick = event => {
    State.change = true;
   
    if(graph.contextmenu.classList.contains("view")){
        graph.contextmenu.className = "";
        graph.contextmenu.classList.add("hidden");    
    }
    if(event.ctrlKey){
        if(graph_vistor.goto_select()){
            reload_document();
        }    
    }
}
window.oncontextmenu = event => {
    State.change = true;
    event.preventDefault();
    if(!State.view){
        graph_vistor.contextmenu(State.mouse_state.pos, graph.contextmenu);
    }
}
window.onmousemove = event => {
    State.change = true;
    State.mouse_state = { 
        pos: Vector.make(event.clientX, event.clientY) 
    };
};

const toggle_edit = () => {
    for(let tag in view){
        class_swap(view[tag], "view", "edit", State.edit);
    }
    State.edit = !State.edit;
};
const toggle_view = () => {
    class_swap(view.view, "min", "shown", State.view);
    State.view = !State.view;
};
const action_rot = (n, lock) => { 
    if(lock  && State.edit){ 
        graph_vistor.swap_pointer(n); 
    }
    else{ 
        graph_vistor.move_pointer(n);
        reload_document();
    }
};

canvas.display.oncontextmenu = _ => {
    graph_vistor.contextmenu(State.mouse_state.pos, graph.contextmenu);
}
canvas.display.onkeydown = event => {
    let C = true;
    let edit = event.ctrlKey && State.edit;

    switch(event.code){

        case "ArrowLeft":   action_rot(-1); break;
        case "ArrowRight":  action_rot(+1); break;

        case "ArrowUp":     
            if(edit){ 
                graph_vistor.change_length(+1); 
                event.preventDefault();
            }
            else{ 
                graph_vistor.goto_child();
                reload_document();
            }
            break;
        case "ArrowDown":   
            if(edit){ 
                graph_vistor.change_length(-1); 
                event.preventDefault();
            }
            else{ 
                graph_vistor.goto_parent();
                reload_document();
            }
            break;
        
        case "Equal": 
            if(edit){
                graph_vistor.add_child(); 
                event.preventDefault();
            }
            else{ 
                State.scale *= 1.025; 
            }
            break;
            
        case "Minus": 
            if(edit){ 
                graph_vistor.remove_child(); 
                event.preventDefault();
            }
            else{ 
                State.scale /= 1.025; 
            }
            break;
        default: C = false; break;
    }    
    State.change = C || State.change;
};

const main_loop = () => {
    if(State.change){
        context.display.fillStyle = Util.rgba(50);
        context.display.fillRect(0, 0, width, height);
    
        context.pointer.fillStyle = Util.rgba(0);
        context.pointer.fillRect(0, 0, width, height);
    
        context.display.textBaseline = "middle";
        context.display.textAlign = "center";
    
        let pos = Vector.make(width * 0.5, height * 0.5);
        let R = Math.min(width, height) * 0.5;
    
        if(viewer != null){
            graph_vistor
                .draw(pos, State.scale * R * 0.08)
                .touch(State.mouse_state)
            
            if(!State.view){
                graph_vistor
                    .draw_tooltip(graph.tooltip, graph.contextmenu);
            }
        }

        State.change = false;
    }

    if(graph_vistor.edited){
        document.title = "NoteForest [Unsaved]";
    }
    else{
        document.title = "NoteForest"
    }

    DocWorker.update_output();
    window.requestAnimationFrame(main_loop);
}

const init = () => {
    renderer = new Graph.Renderer(context.display, context.pointer);
    graph_vistor = new Graph.Vistor(node, renderer);
    graph_vistor.edited = false;

    main_loop();    
    reload_document();
}

XHR.request("GET", "$/data_load").then(
    data => { 
        node = Graph.Node.json_decode(data);
        init();
    }
).catch(
    err => {
        console.log("Creating new graph!", err);
        node = new Graph.Node();     
        init();
    }
);