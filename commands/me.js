const Discord = require('discord.js');
const config = require("../config");
const dcbot = require('../scripts/discordBot.js');


function me(message){
	//show stats for the user that issued the command or mentioned user
    const players = dcbot.getPlayers();
    let flag = false;
    let target;
    message.mentions.members.filter(member => {
        target = member.user;
        flag = true;
    });
    if (isNaN(target) && !flag) {
        target = message.author;
    }
    if(!players.hasOwnProperty(target.id)){
        message.react('❓');
        return;
    }
    //return embed with stats
    let matchlist = '';
    let positionlist = '';
    let scorelist = '';
    const top = players[target.id].scoreConsec();
    let topScore = top[0]/1000;
    let topIndex = top[1];
    if(topIndex == -1) topScore = `You need to play ${config.bestof} matches in total`;
    let index1 = topIndex;
    let index2 = topIndex+4;
    for(let i = 0; i < players[target.id].scores.length; i++){
        if(index1 == i && topIndex != -1){
            matchlist += '**';
            scorelist += '**';
            positionlist += '**';
        }
        matchlist += `${i+1}\n`;
        scorelist += `${players[target.id].scores[i]/1000}\n`;
        positionlist += `${players[target.id].positions[i]}\n`;
        if(index2 == i && topIndex != -1){
            matchlist += '**';
            scorelist += '**';
            positionlist += '**';
        }
    }
    let embed = new Discord.EmbedBuilder()
        .setTitle(`${target.username}'s Tournament stats`)
        .setDescription(`${config.invisibleCharacter}`)
        .setColor(0XF1B843)
        .addFields(
            {
                name: 'Match', 
                value: `${matchlist}`, 
                inline: true,
            },{
                name: 'Score', 
                value: `${scorelist}`, 
                inline: true,
            },{
                name: 'Position', 
                value: `${positionlist}`, 
                inline: true,
            },{
                name: `Top ${config.bestof} consecutive games score`, 
                value: `${topScore}`,
                inline: false,
            })
        .setTimestamp();
    message.reply({content: config.invisibleCharacter, embeds: [embed]});
}
module.exports = me;