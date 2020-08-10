import * as Util from "./util.js"
import * as Vector from "./vector.js";

class ColorID_Generator{
    constructor(N){
        this.part = [0,0,0];
        this.N = N;
    }
    next_ID(){
        this.part[0]++;

        for(let i = 0; i < this.part.length - 1; i++){
            if(this.part[i] >= this.N){
                this.part[i] = 0
                this.part[i + 1] += 1;
            }
        }

        let N = this.part.length;
        if(this.part[N - 1] >= this.N){
            this.part[N - 1] = 0;
            this.part[0] = 1; //Range ID = 1 -> 3^N - 1
        }
        
        return this.part;
    }
}
class Renderer{
    constructor(display_context,  pointer_context){
        this.dctx = new Vector.Renderer(display_context);
        this.pctx = new Vector.Renderer(pointer_context);
        
        this.encode = {
            gen: new ColorID_Generator(8),
            val: {}
        };
    }

    thickness(width){
        this.dctx.thickness(width);
        return this;
    }
    stroke(color){
        this.dctx.stroke(color);
        return this;
    }
    text(text, P){
        this.dctx.text(text, P);
    }
    fill(color){
        this.dctx.fill(color);
        return this;
    }
    font(font, R){
        this.dctx.font(font, R);
        return this;
    }

    encode_col(num){
        let N = 256;
        let k = Math.floor(N / this.encode.gen.N);
        let [r, g, b] = this.encode.gen.next_ID();
        return Util.rgba(
            (r * k) % N, (g * k) % N, (b * k) % N);
    }
    encode_obj(ref){
        let col = this.encode_col();
        //console.log(col);
        this.encode.val[col] = ref;
        return col;
    }
    touch(P){
        let col = this.pctx.getPixel(P);
        
        if(col in this.encode.val){
            return this.encode.val[col];
        }

        return null;
    }

    draw_link(ref, R, A, B){
        let col = this.encode_obj(ref);

        this.pctx
            .thickness(R * 0.5)
            .stroke(col)
            .line(A, B);

        this.dctx
            .thickness(R * 0.2)
            .stroke(Util.rgba(160))
            .line(A, B);

        return this;
    }
    draw_node(ref, pos, R, text){
        let col = this.encode_obj(ref);

        this.pctx
            .thickness(0)
            .fill(col)
            .disc(pos, 1.5 * R);

        this.dctx
            .thickness(0)
            .fill(Util.rgba(200))
            .disc(pos, R)          
            .fill(Util.rgba(0))
            .text(text, pos.copy().add(Vector.make(0, 0.1 * R)));

        return this;
    }
    draw_nodeSelection(pos, R){
        this.dctx
            .thickness(R * 0.2)
            .disc(pos, 1.25 * R, false);
        return this; 
    }
    draw_linkSelection(pos, R, r_vec){
        this.dctx
            .thickness(R/5)
            .stroke(Util.rgba(120, 80, 140))
            .line(pos, r_vec);

        return this
            .stroke(Util.rgba(160, 40, 160))
            .draw_nodeSelection(r_vec, R);
    }
    draw_linkHover(pos, R, r_vec){
        return this.dctx
            .thickness(R/4)
            .stroke(Util.rgba(120, 80, 140))
            .line(pos, r_vec);
    }
};
class VLink{
    constructor(parent, child, len = 1){
        this.parent
    }
}

class Link{
    constructor(parent, child, len = 1){
        this.parent = parent;
        this.child = child;
        this.len = len;

        this.dir = 0;
        this.dir_vec = Vector.fromPolar(this.dir);
        this.highlight = false;

        this.gfig = {};
    }

    getVec(origin, R, dir = 1){
        return origin.copy().add_mul(this.dir_vec, dir * 4 * this.len * R); 
    }

    draw(renderer, pos, R, draw_limit){
        let r_vec = this.getVec(pos, R);

        renderer.draw_link(this, R, pos, r_vec);
        
        if(this.highlight){
            renderer.draw_linkSelection(pos, R, r_vec);
        }    
        if(this.hover){
            renderer.draw_linkHover(pos, R, r_vec);
            this.hover = false;
        }

        this.child.draw(renderer, r_vec, R, draw_limit);

        if(this.highlight){
            renderer
                .stroke(Util.rgba(200, 140, 100))
                .draw_nodeSelection(pos, R)
                .stroke(Util.rgba(100, 100, 200))
                .draw_nodeSelection(pos, R);
        }
    }
    rearrange(){
        this.child.dir = Math.PI + this.dir;

        this.dir_vec = Vector.fromPolar(this.dir);
        this.child.rearrange();
    }
}

class Doc{
    static Tags = { 
        THUMBNAIL: "thumbnail", 
        TITLE: "title", 
        DATA: "data" 
    };

    constructor(data = ""){
        this.thumbnail = "?";
        this.title = "?";
        this.data = data;
    }

    empty(){
        return (this.data.match(/^\s*$/) != null);
    }
    json_encode(){
        return { 
            data: this.data
        }; 
    }
    static json_decode(data){
        return new Doc(data.data);
    }
}
class Node{
    constructor(data = new Doc()){
        this.dir = 0;
        this.highlight = false;

        this.plink = null;
        this.links = [];

        this.crosslinks = [];

        this.data = data;
    }

    has_parent(){
        return (this.plink != null 
            && this.plink.parent != null);
    }
    get_parent(){
        return this.plink.parent;
    }

    get_root(){
        let root = this;

        while(root.has_parent()){
            root = root.get_parent();
        }
        return root;
    }
    empty(){
        if(this.links.length > 0){
            return false;
        }
        return this.data.empty();
    }

    rearrange(){
        const k = (this.plink != null) ? 1 : 0;

        const N = this.links.length + k;
        const dA = 2 * Math.PI / N;

        let A = this.dir + k*dA;
        for(let link of this.links){
            link.dir = A;
            link.rearrange();
            A += dA;
        }
    }

    json_encode(){
        let children_data = [];
        for(let i = 0; i < this.links.length; i++){
            children_data.push(
                { 
                    len: this.links[i].len,
                    child: this.links[i].child.json_encode()
                }
            );
        }

        let data = { 
            doc: this.data.json_encode(),
            children_link: children_data
        };

        return data;
    }
    static json_decode(data){
        const node = new Node(Doc.json_decode(data.doc));
        for(let link of data.children_link){
            node.add_node(Node.json_decode(link.child), link.len);
        }
        return node;
    }

    add_node(node, len = 1){
        if(this.node != node 
        && node.plink === null
        && this.links.indexOf(node) === -1){
            node.plink = new Link(this, node, len);

            this.links.push(node.plink);
            this.rearrange();
        }
        return this;
    }
    remove_node(i){
        if(0 <= i && i < this.links.length){
            if(this.links[i].child.empty()){
                this.links.splice(i, 1);
                this.rearrange();    
            }
        }
    }
    draw_self(renderer, pos, R){
        renderer.draw_node(this, pos, R, this.data.thumbnail);

        if(this.hover){
            renderer    
                .thickness(R/5)
                .stroke(Util.rgba(230, 130, 100))    
                .draw_nodeSelection(pos, R)
                .text(this.data.title, 
                    pos
                        .copy()
                        .add(
                            Vector.make(0.5*R, 0.5*R)));

            this.hover = false;
        }
    }

    draw_fromroot(renderer, pos, R){
        let node = this;
        let origin = pos;

        while(node.plink != null){
            origin = node.plink.getVec(origin, R, -1);
            node = node.plink.parent;
        }
        node.draw(renderer, origin, R, 50);
    }

    draw(renderer, pos, R, draw_limit = 0){
        if(draw_limit > 0){
            for(let link of this.links){
                link.draw(renderer, pos, R, draw_limit - 1);
            }    
        }
        
        this.draw_self(renderer, pos, R);
    }

    root_apply(node_apply, link_apply){
        node_apply(this);
        for(let link of this.links){
            link_apply(link);
            link.child.root_apply(node_apply, link_apply);
        }
    }
    set_hub(){
        let node = this;
        while(node.plink != null){
            node = node.plink.parent;
        }

        node.root_apply(
            _ => { },
            link => { link.highlight = false; }
        );
        
        node = this;
        while(node.plink != null){
            node.plink.highlight = true;
            node = node.plink.parent;
        }
    }
};
class Vistor{
    constructor(node, renderer){
        this.load(node);
        this.renderer = renderer;
    }

    save(){
        return this.node.get_root().json_encode();
    }
    load(node){
        this.node = node;
        this.hov_node = null;

        this.link = 0;
        this.move_pointer(0);
        this.node.set_hub();
    }

    move_pointer(n){
        for(let link of this.node.links){
            link.highlight = false;
        }

        const N = this.node.links.length;
        if(N > 0){
            this.link = Util.mod(this.link + n, N);
            this.node.links[this.link].highlight = true;
        }
        else{
            this.link = 0;
        }
    }
    change_length(len){
        const N = this.node.links.length;
        if(N > 0){
            this.node.links[this.link].len 
                = Util.clamp(this.node.links[this.link].len + len, 1, 10);
        }
    }

    set_data(data){
        this.data = data;
    }
    get_data(){
        return this.node.data;
    }
    goto_parent(){
        for(let link of this.node.links){
            link.highlight = false;
        }

        let plink = this.node.plink;
        if(plink != null && plink.parent){
            plink.highlight = true;
            this.node = plink.parent;
            this.move_pointer(0);
        }
    }
    goto_child(){
        if(this.node.links.length > 0){
            let link = this.node.links[this.link];
            link.highlight = true;

            this.node = link.child;
            this.move_pointer(0);
        }
    }
    goto_select(){
        if(this.hov_node instanceof Node){
            this.load(this.hov_node);
        }
    }

    add_child(){
        this.node.add_node(new Node(new Doc()));
    }
    remove_child(){
        this.node.remove_node(this.link);
        this.move_pointer(0);
    }
    swap_pointer(n){
        const N = this.node.links.length;
        if(N > 0){
            let i = this.link;
            let j = Util.mod(this.link + n, N);
            this.link = j;

            let temp = this.node.links[i];
            this.node.links[i] = this.node.links[j];
            this.node.links[j] = temp;
            this.node.rearrange();
        }
    }

    draw(pos, R, mouse_state){
        this.renderer
            .font("Courier New", R)
            .stroke(Util.rgba(200))
            .fill(Util.rgba(200));

        this.node.draw_fromroot(this.renderer, pos, R, 10);   
        
        this.renderer
            .stroke(Util.rgba(100, 100, 200))
            .draw_nodeSelection(pos, R);

        this.hov_node = this.renderer.touch(mouse_state.pos);
        
        if(this.hov_node != null){
            this.hov_node.hover = true;
        }
    }
};

export { Renderer, Node, Vistor};