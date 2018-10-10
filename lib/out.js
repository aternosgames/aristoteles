function addPrefix(prefix,text){
    text = text || 'undefined';
    return prefix + text.toString().split('\n').join('\n' + prefix);
}

let out = {};

out.info = function(msg){
    console.log(addPrefix('[' + '\x1b[32mINFO\x1b[0m' + '] ',msg));
};

out.dbg = function(msg){
    console.log(addPrefix('[' + '\x1b[33mDBG\x1b[0m' + '] ',msg));
};

out.err = function(msgs){
    if(!(msgs instanceof Array)){
        msgs = [msgs];
    }
    let msg = '';
    for(let i = 0;i < msgs.length;i++){
        if(msgs[i]){
            msg += (msgs[i].stack || msgs[i]) + '\n';
        }else{
            msg += 'Unknown error\n';
        }
    }
    msg = msg.replace(/^\s+|\s+$/g, '');
    console.error(addPrefix('[' + '\x1b[31mERR\x1b[0m' + '] ',msg));
};

module.exports = out;
