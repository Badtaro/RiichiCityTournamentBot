const config = require('../config');
const dcbot = require('../scripts/discordBot.js');

const pos = ['1st','2nd','3rd','4th'];

function matches(message){
    //admin command
    if(!config.superAdmins.includes(message.author.id)){
        message.react('❌');
        return;
    }
    const players = dcbot.getPlayers(); //fetch tournament players
	//check for arguments, specifically a target to display history from
    let msg = message.content.split(' ');
    let flag = false;
    let target;
	//check mentions
    message.mentions.members.filter(member => {
        target = member.user.id;
        flag = true;
    });
    if (!flag) {
		//if user wasn't pinged, then try parsing the content of the message
        if(msg.length >= 2 && !msg[1].isNaN){
            target = msg[1];
        }else{
            target = message.author.id;
        }
    }
    if(!players.hasOwnProperty(target)){ //check if our player list has the target user in it.
        message.react('❓'); //if it doesn't then let the user know.
        return;
    }
    let bulk = []; //prepare multi post if the target played an abusurd amount of games.
    let tmp = `<@${target}>'s matches\n`;
	//build the text string, if it exceeds the discord limit of 2000 character per message, split it into multiple blocks
    for(const i in players[target].games){
        let score = players[target].scores[i]/1000;
        let line = `${players[target].gameIDs[i]} - ${score} - ${pos[players[target].positions[i]-1]}\n`;
        if(tmp.length + line.length > 2000){
            bulk.push(tmp);
            tmp = '';
        }
        tmp += line;
    }
	//add the final text to the block too.
    bulk.push(tmp);
	//send the messages in order
    if(bulk.length > 1){
        for(const i in bulk){
            setTimeout(message.reply(bulk[i]),1000*i);
        }
    }else{
        message.reply(bulk[0]);
    }
}

module.exports = matches;