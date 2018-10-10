const out = require('./out');
const async = require('async');

class AdvancedVoteManager{
    constructor(msg,options){
        this.msg = msg;
        this.options = options;
        this.votes = {};
        this._removeQueue = [];
        this._removeWorkerRunning = false;
        this.ended = false;
        this.resetReactions();
    }
    getTotalVotes(){
        let count = 0;
        for(let uid in this.votes){
            if(!this.votes.hasOwnProperty(uid)){continue;}
            count += 1;
        }
        return count;
    }
    resetReactions(){
        let self = this;
        this.msg.clearReactions()
            .then(function(){
                async.eachOfSeries(self.options,function(option,emoji,callback){
                    self.msg.react(emoji)
                        .then(function(){
                            callback();
                        })
                        .catch(out.err);
                },function(){});
            })
            .catch(out.err);
    }
    removeVote(uid){
        if(!this.votes[uid] || this.ended){
            return;
        }
        this._removeQueue.push({
            user: this.votes[uid].user,
            reaction: this.votes[uid].reaction
        });
        delete this.votes[uid];
        if(!this._removeWorkerRunning){
            this._removeWorkerRunning = true;
            rm(this);
        }
        function rm(self){
            if(!self._removeQueue[0]){
                self._removeWorkerRunning = false;
                return;
            }
            if(self.ended){
                self._removeQueue = [];
                self._removeWorkerRunning = false;
                return;
            }
            setTimeout(function(){
                self._removeQueue[0].reaction.remove(self._removeQueue[0].user)
                    .then(function(){
                        rm(self);
                    })
                    .catch(function(err){
                        out.err(err);
                        rm(self);
                    });
                self._removeQueue.shift();
            },100);
        }
    }
    react(reaction, user){
        let emoji = reaction.emoji.name;
        if(!this.options[emoji] || this.ended){
            return;
        }
        this.clearRemoved(reaction);
        if(this.votes[user.id] && this.votes[user.id].reaction.emoji.name === emoji){
            delete this.votes[user.id];
        }
        if(this.votes[user.id]){
            this.removeVote(user.id);
            out.dbg('User ' + user.username + ' has changed his mind and voted for ' + emoji);
        }else{
            out.dbg('User ' + user.username + ' voted for ' + emoji);
        }
        this.votes[user.id] = {
            user: user,
            reaction: reaction
        };
    }
    clearRemoved(reaction){
        let remove = [];
        for(let uid in this.votes){
            if(!this.votes.hasOwnProperty(uid) || this.votes[uid].reaction.emoji.name !== reaction.emoji.name){
                continue;
            }
            if(!reaction.users.has(uid)){
                out.dbg('User ' + this.votes[uid].user.username + ' removed his vote for ' +
                    this.votes[uid].reaction.emoji.name);
                remove.push(uid);
            }
        }
        for(let i = 0; i < remove.length;i++){
            delete this.votes[remove[i]];
        }
    }
    getCurrent(){
        let result = {};
        for(let emoji in this.options){
            if(!this.options.hasOwnProperty(emoji)){continue;}
            result[emoji] = [];
        }
        for(let uid in this.votes){
            if(!this.votes.hasOwnProperty(uid)){continue;}
            let emoji = this.votes[uid].reaction.emoji.name;
            result[emoji].push(this.votes[uid].user);
        }
        let list = [];
        for(let emoji in result){
            if(!result.hasOwnProperty(emoji)){continue;}
            list.push({
                emoji: emoji,
                users: result[emoji]
            });
        }
        return list;
    }
    end(collection){
        this.ended = true;
        this.msg.clearReactions()
            .catch(out.err);
        let reactions = collection.array();
        for(let i = 0; i < reactions.length; i++){
            this.clearRemoved(reactions[i]);
        }
        return this.getCurrent();
    }
}


module.exports = AdvancedVoteManager;