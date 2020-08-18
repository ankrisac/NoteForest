const $ = selector => {
    switch(selector[0]){
        case "#":
            return document.getElementById(selector.slice(1));
        case '.':
            return document.getElementsByClassName(selector.slice(1));
        case undefined:
            return null;
        default:
            return document.getElementsByTagName(selector);
    }
};

$.newText = text => document.createTextNode(text);
$.newElem = name => document.createElement(name);
$.newAttr = attr => document.createAttribute(attr);