function split(str,splitAt = [' ']){
    if(!(splitAt instanceof Array)){
        splitAt = [splitAt];
    }
    let parts = [];
    let q1 = false;
    let q2 = false;
    let cPart = '';

    for(let i = 0; i < str.length; i++){
        let char = str.charAt(i);

        if(isEscaped(str,i)){
            continue;
        }
        if(char === '"' && !q2){
            q1 = !q1;
        }
        if(char === '\'' && !q1){
            q2 = !q2;
        }

        if(!q1 && !q2 && splitAt.includes(char)){
            parts.push(cPart);
            cPart = '';
            continue;
        }
        cPart += char;
    }
    parts.push(cPart);
    return parts;
}

function unwrap(str){
    if(!str){
        return str;
    }
    if(str.substr(0,1) === '"' || str.substr(0,1) === '\''){
        str = str.substr(1);
    }
    if(str.slice(-1) === '"' || str.slice(-1) === '\''){
        str = str.substr(0,str.length - 1);
    }
    return str;
}

function isEscaped(str,index){
    if(str.charAt(index-1) !== '\\'){
        return false;
    }
    return !isEscaped(str,index-1);
}

module.exports = {
    split: split,
    unwrap: unwrap
};