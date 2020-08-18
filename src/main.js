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
    saved: true,

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

let view = {
    view: $("#viewer"),
    out: $("#output"),
    inp: $("#editor")
};
let output = {
    title: $("#output_title"),
    data: $("#output_display")
}
let input = {
    syntax: $("#editor_syntax"),
    data: $("#editor_data")
};

const input_update = () => {
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

const update_viewer = () => {
    let text = input.data.innerText;
    let doc = Parser.eval_doc(text);
    graph_vistor.node.data.title = doc.title;
    graph_vistor.node.data.thumbnail = 
        (doc.thumbnail.length > 0) ? doc.thumbnail : "?";

    output.title.innerText = 
        (doc.title.length > 0) ? doc.title : "Untitled Doc";
    output.data.innerHTML = doc.data;

    input.syntax.innerHTML = Parser.highlight(text);    

};
const sync_viewer = () =>{
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
    let C = true;
    switch(event.code){        
        case "KeyS":
            if(State.keyboard.shift){
                XHR.request("POST", "$/data_save", 
                    graph_vistor.save()
                ).then(() => { console.log("SAVED!"); })
                .catch(() => { 
                    alert("Saving not supported!"); 
                });
                State.saved = true;
            }
            break;
        case "ShiftLeft": State.keyboard.shift = true; break;
        default: C = false; break;
    }  
    State.change = C || State.change;
};

window.onclick = _ => {
    State.change = true;

    if(graph.contextmenu.classList.contains("view")){
        graph.contextmenu.className = "";
        graph.contextmenu.classList.add("hidden");    
    }
    else if(document.activeElement == canvas){
        if(graph_vistor.goto_select()){
            sync_viewer();
        }
    }
}
window.oncontextmenu = event => {
    State.change = true;
    event.preventDefault();
    graph_vistor.contextmenu(State.mouse_state.pos, graph.contextmenu);
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
    if(State.keyboard.shift  && State.edit){ 
        graph_vistor.swap_pointer(n); 
    }
    else{ 
        graph_vistor.move_pointer(n);
        sync_viewer();
    }
};
canvas.display.onkeydown = event => {
    let C = true;
    switch(event.code){
        case "KeyV": toggle_view(); break;
        case "KeyE": toggle_edit(); break;

        case "ArrowLeft":   action_rot(-1); break;
        case "ArrowRight":  action_rot(+1); break;

        case "ArrowUp":     
            if(State.keyboard.shift && State.edit){ 
                graph_vistor.change_length(+1); 
            }
            else{ 
                graph_vistor.goto_child();
                sync_viewer();
            }
            break;
        case "ArrowDown":   
            if(State.keyboard.shift && State.edit){ 
                graph_vistor.change_length(-1);
            }
            else{ 
                graph_vistor.goto_parent();
                sync_viewer();
            }
            break;
        
        case "Equal": 
            if(State.edit && State.keyboard.shift){ 
                graph_vistor.add_child(); 
            }
            else{ 
                State.scale *= 1.025; 
            }
            break;
            
        case "Minus": 
            if(State.edit && State.keyboard.shift){ 
                graph_vistor.remove_child(); 
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
            
            if(document.activeElement === canvas){
                graph_vistor
                    .draw_tooltip(graph.tooltip, graph.contextmenu);
            }
        }

        State.change = false;
    }

    window.requestAnimationFrame(main_loop);
}

const init = () => {
    renderer = new Graph.Renderer(context.display, context.pointer);
    graph_vistor = new Graph.Vistor(node, renderer);

    sync_viewer();
    main_loop();    
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