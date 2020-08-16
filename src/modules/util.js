const mod = (n, m) => ((n % m) + m) % m;
const clamp = (val, min, max) => 
    (val < min) ? min : ((val > max) ? max : val);

const rgba = (r, g = null, b = null, a = 1.0) => {
    g = (g == null) ? r : g;
    b = (b == null) ? g : b;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}
const array_remove = (lst, elem) => {
    let i = lst.indexOf(elem);
    if(i != -1){
        lst.splice(i, 1);
        return true;
    }
    return false;
}

export { mod, clamp, rgba, array_remove };