class AbstractLink{
    constructor(parent, child, taper = 0.05){
        this.parent = parent;
        this.child = child;
        this.taper = taper;
    }

    getVec(O, scale){
        return O.cadd_mul(4 * this.len * scale, this.R.vec); 
    }

    gfig_dim(){
        return [
            this.parent.gfig.scale,
            this.parent.gfig.P,
            this.child.gfig.P
        ];
    }

    gfig_draw_links(renderer, render){
        let [scale, A, B] = this.gfig_dim();
        renderer.draw_link(scale, A, B, this.taper, this);
        render(scale, A, B)
        return this;
    }

    draw_tooltip(menu){
        menu.classList.add("hidden");
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

class MinorLink extends AbstractLink{
    constructor(parent, child){
        super(parent, child, 0.05);
    }

    gfig_draw_links(renderer){
        return super.gfig_draw_links(renderer,
            (scale, A, B) => {
                if(this.hover){
                    renderer.draw_link_hover(scale, A, B, this.taper);
                    this.hover = false;
                }
            }
        );
    }
    delete(){
        if(this.parent != null){
            Util.array_remove(this.parent.links.minor, this)
        }
        if(this.child != null){
            Util.array_remove(this.parent.links.minor_parents, this);
        }
    }

    make_major(){
        let [C, P] = [this.child, this.child.links.major_parent.parent];

        this.delete();
        this.child.delete_parent_links();

        Util.array_remove(this.parent.links.minor, this);

        this.parent.add_node(this.child);
        P.add_minor_link(C);
    }
    contextmenu(vistor, P, menu){
        menu.classList.add("view");
        menu.style.top = `${P.y}px`;
        menu.style.left = `${P.x}px`;

        action(menu, "Go to Parent", () => vistor.load(this.parent));
        action(menu, "Go to Child", () => vistor.load(this.child));
        action(menu, "Delete", () => this.delete());
        action(menu, "Make Major Link", () => this.make_major());
    }
}
class MajorLink extends AbstractLink{
    constructor(parent, child, len = 1){
        super(parent, child, 0.1);
        this.len = len;

        this.R = {
            angle: 0,
            vec: Vector.fromPolar(this.dir)
        };
        this.active = false;
    }

    gfig_draw_links(renderer){
        return super.gfig_draw_links(renderer, 
            (scale, A, B) => {
                if(this.hover){
                    renderer.draw_link_hover(scale, A, B, this.taper);
                    this.hover = false;
                }
                else if(this.active){
                    renderer.draw_link_active(scale, A, B, this.taper)
                }
                this.child.gfig_draw_links(renderer);
            }
        );
    }
    gfig_draw_nodes(renderer){
        let [scale, A, _] = this.gfig_dim();
        if(this.active){
            renderer
                .stroke(Util.rgba(100, 100, 200))
                .draw_node_outline(A, scale);
        }        
        this.child.gfig_draw_nodes(renderer);
        return this;
    }

    rearrange(){
        this.child.R.angle = Math.PI + this.R.angle;
        this.R.vec = Vector.fromPolar(this.R.angle);
        this.child.rearrange();
    }
    contextmenu(vistor, P, menu){
        menu.classList.add("view");
        menu.style.top = `${P.y}px`;
        menu.style.left = `${P.x}px`;

        action(menu, "Go to Parent", () => vistor.load(this.parent));
        action(menu, "Go to Child", () => vistor.load(this.child));
    }
}

export { MajorLink, MinorLink };