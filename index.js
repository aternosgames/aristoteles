const Discord = require('discord.js');
const config = require('./config');
const helper = require('./lib/helper');
const out = require('./lib/out');
const AdvancedVoteManager = require('./lib/AdvancedVoteManager');
const BasicVoteManager = require('./lib/BasicVoteManager');

const emojiLetters = [];
for(let i = 127462; i <= 127487; i++){
    emojiLetters.push(String.fromCodePoint(i));
}

let client;
connect();

/**
 * connect/reconnect to Discord
 *
 */
function connect(){
    if(client){
        client.destroy();
    }
    client = new Discord.Client();
    client.login(config.token);

    client.on('error',function(err){
        out.err(err);
    });

    client.on('ready',function(){
        out.info('Logged in as ' + client.user.tag);
    });

    client.on('disconnect',function(){
        out.err('Disconnected');
        connect();
    });
    client.on('message', msg => {
        handleMessage(msg);
    });
}

/**
 * Handle an incoming Discord message
 *
 * @param msg
 */
function handleMessage(msg){
    let args = helper.split(msg.content,' ');
    if(args[0] !== '.vote' && args[0] !== '.aristoteles'){
        return;
    }
    if(args.length < 2){
        cmd.help(msg);
        return;
    }
    switch (args[1].toLowerCase()) {
        case 'help':
            cmd.help(msg);
            break;
        case 'start':
            cmd.start(msg,args);
            break;
        default:
            cmd.help(msg);
            break;
    }
}


const cmd = {
    /**
     * Send usage/help
     *
     * @param msg
     */
    help: function(msg){
        msg.channel.send([
            'Usage: `.vote start <question> --options <options> --duration <time> [--notify] [--advanced]`',
            '`--options` - Answer options seperated by spaces, default \'Yes\' and \'No\'',
            '`--duration` - Duration in minutes, default 5',
            '`--notify` - Send notification when voting is over',
            '`--advanced` - Reactions are not removed immediately and voters can change or withdraw their votes, ' +
            'looks a bit better but is not recommended for greater amounts of potential voters',
            '',
            'Example: `.vote start "What is the answer to the ultimate question of life, the universe and everything?" --options "42" "something else" --duration 5 --notify`'
        ]);
    },
    /**
     * Parse a '.vote start' Discord command and start a vote
     *
     * @param msg
     * @param args
     * @returns {*|void}
     */
    start: function(msg,args){
        let question = helper.unwrap(args[2]);
        if(!question){
            return cmd.help(msg);
        }
        let options = [];
        let optionsIndex = args.indexOf('--options');
        if(optionsIndex === -1){
            options = false;
        }else{
            let i = 1;
            while(args[optionsIndex + i] && args[optionsIndex + i].substr(0,2) !== '--'){
                options.push(helper.unwrap(args[optionsIndex + i]));
                i += 1;
            }
            if(options.length === 0){
                options = false;
            }
        }
        let timeIndex = args.indexOf('--duration');
        let time = 5;
        if(timeIndex !== -1 && args[timeIndex + 1] && !isNaN(helper.unwrap(args[timeIndex + 1]))){
            time = Math.min(240,Math.max(1,parseFloat(helper.unwrap(args[timeIndex + 1]))));
        }
        startVote(question,options,msg,time * 60 * 1000,args.includes('--advanced'),args.includes('--notify'));
    }
};

/**
 * Start a vote with the specified options
 *
 * @param text
 * @param optionsArray
 * @param msg
 * @param time
 * @param advanced
 * @param notify
 */
function startVote(text,optionsArray,msg,time = 5,advanced = false,notify = false){
    let VoteManager = (advanced ? AdvancedVoteManager : BasicVoteManager);
    let options = buildOptions(optionsArray);
    let endTime = Date.now() + time;
    let embed = new Discord.RichEmbed();
    embed.setAuthor(msg.author.username,msg.author.displayAvatarURL);
    buildMsg(embed,text,options,null,endTime,advanced);
    msg.channel.send(embed)
        .then(function(message){
            msg.delete()
                .catch(out.err);
            let voteMgr = new VoteManager(message,options);

            let lastStatusMsg = buildMsg(embed,text,options,voteMgr,endTime,advanced).description;
            message.edit(embed)
                .catch(out.err);
            let msgUpdateInterval = setInterval(function(){
                let statusMsg = buildMsg(embed,text,options,voteMgr,endTime,advanced).description;
                if(statusMsg !== lastStatusMsg){
                    out.dbg('update');
                    message.edit(embed)
                        .catch(out.err);
                    lastStatusMsg = statusMsg;
                }
            },4000);

            const filter = function(reaction,user){
                reaction.user = user;
                return options[reaction.emoji.name] && user.id !== client.user.id;
            };

            const collector = message.createReactionCollector(filter, { time: time });
            collector.on('collect', function(reaction){
                if(!reaction.user){
                    return;
                }
                voteMgr.react(reaction,reaction.user);
            });
            collector.on('end', function(collection){
                voteMgr.end(collection);
                clearInterval(msgUpdateInterval);
                message.edit(buildMsg(embed,text,options,voteMgr,endTime,advanced))
                    .catch(out.err);
                if(notify){
                    message.channel.send(buildNotification(voteMgr.getCurrent()))
                        .catch(out.err);
                }
            });
        })
        .catch(out.err);
}

/**
 * Assign emoji to answer options
 *
 * @param options
 */
function buildOptions(options){
    let newOptions = {};
    if(!options){
        newOptions[emojiLetters[24]] = 'Yes';
        newOptions[emojiLetters[13]] = 'No';
        return newOptions;
    }

    for(let i = 0; i < options.length; i++){
        if(!emojiLetters[i]){
            break;
        }
        newOptions[emojiLetters[i]] = options[i];
    }
    return newOptions;
}

/**
 * Create/update the Discord message representing vote
 *
 * @param richEmbed
 * @param question
 * @param options
 * @param voteMgr
 * @param endTime
 * @param advanced
 * @returns {*}
 */
function buildMsg(richEmbed, question, options, voteMgr, endTime, advanced = false){
    let userVotes = 0,
        totalVotes = 0,
        ended = false;
    if(voteMgr){
        userVotes = voteMgr.getCurrent();
        totalVotes = voteMgr.getTotalVotes();
        ended = voteMgr.ended;
    }

    richEmbed.setTitle(question);
    richEmbed.setColor(ended ? 0xCCCCCC : 0x1FD78D);

    let description = [];
    let defaultUserVotes = [];
    let optionStrings = [];
    for(let key in options){
        if(!options.hasOwnProperty(key)){continue;}
        optionStrings.push(key + '  ' + options[key]);
        defaultUserVotes.push({
            emoji: key,
            users: []
        });
    }
    description.push(optionStrings.join('\n\n'));
    let winner = [];
    let diagram = [];
    userVotes = userVotes || defaultUserVotes;
    let max = 0;
    for(let i = 0; i < userVotes.length;i++){
        let votes = userVotes[i].users.length;
        if(votes === max){
            winner.push(userVotes[i].emoji);
        }else if(votes > max){
            winner = [userVotes[i].emoji];
            max = votes;
        }
        diagram.push(userVotes[i].emoji + ' ' +
            ('[][][][][][][][][][][][][][][][][][][][][][][][][]').substr(0,Math.round(votes/totalVotes*50)) +
            '   **' + votes + '**');
    }
    let winnerString = winner.length === userVotes.length ? '`A draw`' : winner.join(', ');

    description.push('');
    if(ended){
        description.push('**Final winner' + (winner.length !== 1 && winner.length !== userVotes.length ? 's' : '') +
            ':** ' + winnerString);
    }else{
        description.push('Ending in ' + Math.ceil((endTime - Date.now()) / 1000 / 60) + ' min, currently leading: ' + winnerString);
    }
    description.push('');
    description.push(diagram.join('\n\n'));
    if(!ended){
        description.push('');
        description.push('*Use the reactions to vote' + (advanced ? '.*': ', you can only vote once and you cannot change your vote.*'));
    }
    richEmbed.setDescription(description.join('\n'));
    return richEmbed;
}

/**
 * Create the notification message sent when a voting is over
 *
 * @param userVotes
 * @returns {string}
 */
function buildNotification(userVotes){
    let winner = [];
    let max = 0;
    for(let i = 0; i < userVotes.length;i++){
        let votes = userVotes[i].users.length;
        if(votes === max){
            winner.push(userVotes[i].emoji);
        }else if(votes > max){
            winner = [userVotes[i].emoji];
            max = votes;
        }
    }
    let winnerString = winner.length === userVotes.length ? '`A draw`' : winner.join(', ');
    return 'Voting is over. Final winner' + (winner.length !== 1 && winner.length !== userVotes.length ? 's' : '') +
        ': ' + winnerString;
}
