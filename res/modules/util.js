function mod(n, m){
    return ((n % m) + m) % m;
}
function clamp(val, min, max){
    return (val < min) ? min : ((val > max) ? max : val);
}
function rgba(r, g = null, b = null, a = 1.0){
    g = (g == null) ? r : g;
    b = (b == null) ? g : b;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export { mod, clamp, rgba };