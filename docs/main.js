import * as Graph from "/modules/graphnode.js";
import { Vector } from "/modules/vector.js";
import * as Util from "/modules/util.js";
import * as Parser from "/modules/parser.js";

let canvas = {
    display: document.getElementById("canvas-display"),
    pointer: document.getElementById("canvas-pointer")
};
let context = {
    display: canvas.display.getContext("2d"),
    pointer: canvas.pointer.getContext("2d")
};


class Viewer{
    constructor(node, renderer){
        this.graph_vistor = new Graph.Vistor(node, renderer);

        this.view = {
            view: document.getElementById("viewer"),
            out: document.getElementById("output"),
            inp: document.getElementById("editor")
        };
        this.output = {
            title: document.getElementById("output_title"),
            data: document.getElementById("output_display")
        }
        this.input = {
            syntax: document.getElementById("editor_syntax"),
            data: document.getElementById("editor_data")
        };
        this.input.data.oninput = () => { 
            this.graph_vistor.node.data.data = this.input.data.innerText;
            this.update_viewer();
        };

        this.view.inp.onkeydown = (event) => {
            if(event.code == "Tab"){
                event.preventDefault();
                document.execCommand("insertText", false, '  ');
                this.selectionStart = this.selectionEnd + 1
            }
        }

        this.__reset()
    }

    save(){
        return this.graph_vistor.save();
    }
    __reset(){
        this.mode = { 
            edit: false, 
            view: false 
        };
        this.scale = 1;

        this.sync_data();
        this.update_viewer();
    }
    load(node){
        this.graph_vistor.load(node);
        this.__reset()
    }

    sync_data(){
        this.input.data.innerText = this.graph_vistor.node.data.data;
    }
    update_viewer(){
        let text = this.input.data.innerText;
        let doc = Parser.eval_doc(text);

        this.graph_vistor.node.data.title = doc.title;
        this.graph_vistor.node.data.thumbnail = (doc.thumbnail.length > 0) ? doc.thumbnail : "?";

        this.output.title.innerText = (doc.title.length > 0) ? doc.title : "Untitled Doc";
        this.output.data.innerHTML = doc.data;
        this.input.syntax.innerHTML = Parser.highlight(text);
    }

    __class_swap(elem, before, after, swap){
        if(swap){
            [after, before] = [before, after];
        }
        elem.classList.remove(before);
        elem.classList.add(after);
    }

    toggle_edit(){
        for(let tag in this.view){
            this.__class_swap(this.view[tag], "view", "edit", this.mode.edit);
        }
        this.mode.edit = !this.mode.edit;
    }
    toggle_view(){
        this.__class_swap(this.view.view, "min", "shown", this.mode.view);
        this.mode.view = !this.mode.view;
    }

    update_action(){
        this.sync_data();
        this.update_viewer();       
    }
    action_rot(n, lock){
        if(lock && this.mode.edit){ 
            this.graph_vistor.swap_pointer(n); 
        }
        else{ 
            this.graph_vistor.move_pointer(n);
            this.update_action();
        }
    }
    action_up(lock){
        if(lock && this.mode.edit){ 
            this.graph_vistor.change_length(+1); 
        }
        else{ 
            this.graph_vistor.goto_child();
            this.update_action();
        }
    }
    action_down(lock){
        if(lock && this.mode.edit){ 
            this.graph_vistor.change_length(-1);
        }
        else{ 
            this.graph_vistor.goto_parent();
            this.update_action();
        }
    }

    draw(pos, R, mouse_state){
        this.graph_vistor.draw(pos, R * this.scale, mouse_state);
    }

    action_plus(lock){
        if(this.mode.edit && lock){ this.graph_vistor.add_child(); }
        else{ this.scale *= 1.025; }
    }
    action_minus(lock){
        if(this.mode.edit && lock){ this.graph_vistor.remove_child(); }
        else{ this.scale /= 1.025; }
    }

    select(lock){
        if(this.mode.edit && lock){

        }
        else{
            this.graph_vistor.goto_select();
            this.update_action();
        }
    }
}


const sendHttpRequest = (method, url, data) => {
    return new Promise(
        (resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open(method, url);
            xhr.responseType = "json";

            if(data){
                xhr.setRequestHeader("Content-Type", "application/json");
            }

            xhr.onload = () => { 
                if(xhr.status >= 400){
                    reject("Load failed");
                }
                else{
                    resolve(xhr.response); 
                }
            };
            xhr.onerror = () => { reject("Something went wrong!"); };
            xhr.send(JSON.stringify(data));
        }
    );
}

let renderer = new Graph.Renderer(context.display, context.pointer);
let viewer;

sendHttpRequest("GET", "$/data_load").then(
    data => { 
        console.log("Loading graph!");
        console.log("RENDERER", renderer);
        viewer = new Viewer(Graph.Node.json_decode(data), renderer);    
    }
).catch(
    err => {
        console.log("Creating new graph!", err);
        viewer = new Viewer(new Graph.Node(), renderer);    
    }
);

const keyboard = {
    shift: false,
    ctrl: false
};

let mouse_state = { 
    pos: new Vector(0, 0) 
};

let change = true;
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
        change = true;
    }
    resize();
    return resize;
})();
window.onclick = (event) => {
    viewer.select(keyboard.shift);
    change = true;
}
window.onmousemove = (event) => {
    change = true;
    mouse_state = { 
        pos: new Vector(event.clientX, event.clientY) 
    };
};
window.onkeyup = (event) => {
    switch(event.code){
        case "ShiftLeft": keyboard.shift = false; break;
    }  
};
window.onkeydown = (event) => {
    change = true;
    switch(event.code){        
        case "KeyS":
            if(keyboard.shift){
                sendHttpRequest("POST", "$/data_save", 
                    viewer.save()
                ).then(() => { console.log("SAVED!"); })
                .catch(() => { console.log("ERROR!"); });
            }
            break;
        case "ShiftLeft": keyboard.shift = true; break;
        default: change = false; break;
    }  
};
canvas.display.onkeydown = (event) => {
    change = true;
    switch(event.code){
        case "KeyV": viewer.toggle_view(); break;
        case "KeyE": viewer.toggle_edit(); break;

        case "ArrowLeft":   viewer.action_rot(-1, keyboard.shift); break;
        case "ArrowRight":  viewer.action_rot(+1, keyboard.shift); break;

        case "ArrowUp":     viewer.action_up(keyboard.shift);     break;
        case "ArrowDown":   viewer.action_down(keyboard.shift);   break;
        
        case "Equal": viewer.action_plus(keyboard.shift);   break;
        case "Minus": viewer.action_minus(keyboard.shift);  break;
        default: change = false; break;
    }    
};

function draw(){
    let pos = new Vector(width * 0.5, height * 0.5);
    let R = Math.min(width, height) * 0.5;

    if(viewer != null){
        viewer.draw(pos, R * 0.08, mouse_state);
    }
}

let t = 0;
function update(){
    context.display.fillStyle = Util.rgba(50);
    context.display.fillRect(0, 0, width, height);

    context.pointer.fillStyle = Util.rgba(0);
    context.pointer.fillRect(0, 0, width, height);

    context.display.textBaseline = "middle";
    context.display.textAlign = "center";

    draw();    
}

function main_loop(){
    if(change){
        update();
        change = false;
    }

    window.requestAnimationFrame(main_loop);
}
main_loop();
