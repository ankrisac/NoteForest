import * as Node from "./node.js";

class Vistor{
    constructor(node, renderer){
        this.load(node);
        this.renderer = renderer
    }

    save(){
        return this.node.get_root().json_encode();
    }
    load(node){
        this.node = node;
        this.hov_node = null;

        this.link = 0;
        this.move_pointer(0);
        this.node.focus();
    }

    move_pointer(n){
        const links = this.node.links.major;
        for(let link of links){
            link.active = false;
        }

        const N = links.length;
        if(N > 0){
            this.link = Util.mod(this.link + n, N);
            links[this.link].active = true;
        }
        else{
            this.link = 0;
        }
    }
    change_length(len){
        let links = this.node.links.major;

        const N = links.length;
        if(N > 0){
            links[this.link].len = Util.clamp(links[this.link].len + len, 1, 10);
        }
    }

    set_data(data){
        this.data = data;
    }
    get_data(){
        return this.node.data;
    }
    goto_parent(){
        for(let link of this.node.links.major){
            link.active = false;
        }

        let link = this.node.links.major_parent;
        if(link != null && link.parent != null){
            link.active = true;
            this.node = link.parent;
            this.move_pointer(0);
        }
    }
    goto_child(){
        const MLinks = this.node.links.major;
        if(MLinks.length > 0){
            let link = MLinks[this.link];
            link.active = true;
            this.node = link.child;
            this.move_pointer(0);
        }
    }
    goto_select(){
        if(this.hov_node instanceof Node.Node){
            this.load(this.hov_node);
            return true;
        }
        return false;
    }
    add_link(){
        if(this.hov_node instanceof Node.Node){
            return this.node.add_minor_link(this.hov_node);
        }
        return false;
    }

    add_child(){
        this.node.add_node(new Node.Node(new Node.Doc()));
        this.move_pointer(0);
    }
    remove_child(){
        this.node.remove_node(this.link);
        this.move_pointer(0);
    }
    swap_pointer(n){
        let MLinks = this.node.links.major;

        const N = MLinks.length;
        if(N > 0){
            let i = this.link;
            let j = Util.mod(this.link + n, N);
            this.link = j;

            let temp = MLinks[i];
            MLinks[i] = MLinks[j];
            MLinks[j] = temp;
            this.node.rearrange();
        }
    }

    count(){
        return this.node.get_root().num_child();
    }
    draw(P, scale){
        this.renderer
            .font(scale, "Courier New")
            .stroke(Util.rgba(200))
            .fill(Util.rgba(200));

        this.node
            .gfig_get_root(P, scale)
            .gfig_draw_links(this.renderer)
            .gfig_draw_nodes(this.renderer)
            .gfig_draw_root(this.renderer);
    
        return this;
    }
    touch(mouse_state){
        this.hov_node = this.renderer.touch(mouse_state.pos);
        
        if(this.hov_node != null){
            this.hov_node.hover = true;
        }
        return this;
    }

    draw_tooltip(tooltip, contextmenu){
        tooltip.className = "";
        if(this.hov_node === null 
        || contextmenu.classList.contains("view")){
            tooltip.classList.add("hidden");
            return this;    
        }

        this.hov_node.draw_tooltip(tooltip);
        return this;
    }
    contextmenu(P, menu){
        if(this.hov_node !== null){
            menu.innerHTML = "";
            menu.className = "";
            menu.classList.add("view");
            this.hov_node.contextmenu(this, P, menu);
            return true;
        }
        console.log("HIDE!");
        menu.className = "";
        menu.classList.add("hidden");
        return false;
    }
};

export { Vistor };