import * as Link from "./link.js"

class Doc{
    static Tags = { 
        THUMBNAIL: "thumbnail", 
        TITLE: "title", 
        DATA: "data" 
    };

    constructor(data = "", title = "", thumbnail = ""){
        this.title = title;
        this.thumbnail = thumbnail;
        this.data = data;
    }

    empty(){
        return (this.data.match(/^\s*$/) != null);
    }
    json_encode(){
        return { 
            title: this.title,
            thumbnail: this.thumbnail,
            data: this.data
        }; 
    }
    static json_decode(data){
        return new Doc(data.data, data.tile, data.thumbnail);
    }
}

const action = (menu, text, fn, enabled = true) => {
    let btn = $.newElem("div");

    btn.appendChild($.newText(text));
    btn.classList.add("button")

    if(enabled){
        btn.onclick = fn;
        btn.classList.add("enabled");
    }
    else{
        btn.classList.add("disabled");
    }
    menu.appendChild(btn);
}

class Node{
    constructor(data = new Doc()){
        this.active = false;
        this.hover = false;

        this.links = {
            major_parent: null,
            minor_parents: [],
            minor: [],
            major: []
        };

        this.data = data;
        this.gfig;
        this.R = {
            angle: 0
        };
    }

    num_child(){
        let S = 0;
        for(let link of this.links.major){
            S += link.child.num_child();
        }
        return S + 1;
    }

    has_parent(){
        return (this.links.major_parent != null 
            && this.links.major_parent.parent != null);
    }
    get_parent(){
        return this.links.major_parent.parent;
    }

    get_root(){
        let root = this;

        while(root.has_parent()){
            root = root.get_parent();
        }
        return root;
    }
    empty(){
        if(this.links.major.length > 0){
            return false;
        }
        return this.data.empty();
    }

    json_encode(){
        let id = 0;

        const label = node => {
            node.json_id = id++;
            for(let link of node.links.major){
                label(link.child);
            }
            return this;
        }
        const encode = node => (
            {
                id: node.json_id,
                doc: node.data.json_encode(),
                links: {
                    minor:
                        node.links.minor.map(
                            link => link.child.json_id),
                    major:
                        node.links.major.map(
                            link => (
                                { 
                                    len: link.len, 
                                    child: encode(link.child)
                                }
                            )
                        ),
                }
            }
        );
        return encode(label(this));
    }

    static json_decode(data){
        const globalNodes = {};
        
        const decode = data => {
            const node = new Node(Doc.json_decode(data.doc));
            globalNodes[data.id] = node;
    
            for(const link of data.links.major){
                node.add_node(decode(link.child), link.len);
            }
            node.json_minor_links = data.links.minor;
            return node;
        }
        const relink = node => {
            for(const node_id of node.json_minor_links){
                node.add_minor_link(globalNodes[node_id]);
            }
            for(const link of node.links.major){
                relink(link.child);
            }
            return node;
        }
     
        return relink(decode(data));
    }

    add_minor_link(node){
        for(const link of this.links.minor){
            if(link.child === node){
                return false;
            }
        }
        for(let link of node.links.minor){
            if(link.child === this){
                return false;
            }
        }
        
        let link = new Link.MinorLink(this, node);
        this.links.minor.push(link);
        node.links.minor_parents.push(link);
        return true;
    }
    add_node(node, len = 1){
        const MLinks = this.links.major;

        if(this.node === node || node.has_parent()){
            return this;
        }

        for(const link of MLinks){
            if(link.child === node){
                return this;
            }         
        }

        node.links.major_parent = new Link.MajorLink(this, node, len);

        MLinks.push(node.links.major_parent);
        this.rearrange();
        return this;
    }
    remove_node(i){
        const MLinks = this.links.major;
        if(0 <= i && i < MLinks.length
        && MLinks[i].child.empty()){
            MLinks.splice(i, 1);
            this.rearrange();    
        }
    }

    delete_minor_links(){
        for(let link of this.links.minor){
            link.delete();
        }
        for(let link of this.links.minor_parents){
            link.delete();
        }
    }
    delete_parent_links(){
        let parent = this.get_parent();
        if(parent != null){
            Util.array_remove(parent.links.major, this.links.major_parent);    
            this.links.major_parent = null;
            parent.rearrange();
        }
    }
    delete(){
        this.delete_minor_links();
        this.delete_parent_links();
    }

    rearrange(){
        const k = this.has_parent() ? 1 : 0;

        const N = this.links.major.length + k;
        const dA = 2 * Math.PI / N;

        let A = this.R.angle + k * dA;
        for(let link of this.links.major){
            link.R.angle = A;
            link.rearrange();
            A += dA;
        }
    }

    gfig_set(P, scale){
        this.gfig = {
            P: P,
            scale: scale
        };

        for(let link of this.links.major){
            link.child.gfig_set(link.getVec(P, scale), scale);
        }
    }
    gfig_dim(){
        return [this.gfig.P, this.gfig.scale];
    }

    gfig_get_root(P, scale){
        let root = this;
        let O = P;

        while(root.has_parent()){
            O = root.links.major_parent.getVec(O, -scale);
            root = root.get_parent();
        }

        root.gfig_set(O, scale);
        return root;
    }
    gfig_draw_root(renderer){
        let [P, scale] = this.gfig_dim();

        renderer    
            .thickness(scale/5)
            .stroke(Util.rgba(230, 130, 100))    
            .draw_node_outline(P, scale);
        return this;
    }
    gfig_draw_links(renderer){
        for(let link of this.links.major){
            link.gfig_draw_links(renderer);
        }
        for(let link of this.links.minor){
            link.gfig_draw_links(renderer);
        }
        
        return this;
    }
    gfig_draw_nodes(renderer){
        let [P, scale] = this.gfig_dim();

        for(let link of this.links.major){
            link.gfig_draw_nodes(renderer, P, scale);
        }   
        renderer.draw_node(P, scale, this);

        if(this.hover){
            renderer    
                .thickness(scale/5)
                .stroke(Util.rgba(230, 130, 100))    
                .draw_node_outline(P, scale)
                .fill(Util.rgba(0));

            this.hover = false;
        }
        return this;
    }

    graph_apply(node_apply, link_apply){
        node_apply(this);
        for(let link of this.links.major){
            link_apply(link);
            link.child.graph_apply(node_apply, link_apply);
        }
    }
    focus(){
        let root = this;
        while(root.has_parent()){
            root = root.get_parent();
        }

        root.graph_apply(
            _ => { },
            link => { link.active = false; }
        );
        
        root = this;
        while(root.has_parent()){
            root.links.major_parent.active = true;
            root = root.get_parent();
        }
    }

    draw_tooltip(tooltip){        
        let [P, R] = this.gfig_dim();

        if(this.data.title.length > 0){
            tooltip.innerHTML = this.data.title;  
            tooltip.classList.add("view");
            tooltip.style.top = `${P.y + R}px`;
            tooltip.style.left = `${P.x}px`;     
        }
        else{
            tooltip.classList.add("hidden");
        }
    }
    contextmenu(vistor, P, menu){
        menu.classList.add("view");
        menu.style.top = `${P.y}px`;
        menu.style.left = `${P.x}px`;

        action(menu, "Add node", () => this.add_node(new Node(), 1));
        action(menu, "Delete", 
            () => this.delete(), 
            (this.links.major.length === 0 && this.links.major_parent !== null)
        );
        action(menu, "Link", 
            () => vistor.node.add_minor_link(this),
            (this !== vistor.node)    
        );
    }
};

export { Node, Doc };