const config = require('../config.js');

function whois(message,registrants){
	//display riichi city alias of target player
	//there are multiple valid ways to target a player, either mention a player, write their username, their discordID or their riichi city name
	
	//check if the  message was posted in a command channel or if the user is admin
    if(!config.commandChannels.includes(message.channel.id) && !config.superAdmins.includes(message.author.id)) return;
    let target = -1;
    //check mentions first
    if(message.mentions.users.size > 0){
        target = message.mentions.users.firstKey();	//first key is a function to return the first key of the mentions object, if people are mentioning multiple people they're doing it wrong anyway
        target = message.mentions.users.get(target);	//we use get to fetch the first entry of the mentions object with the key we obtained earlier
        if(!registrants.hasOwnProperty(target.id)){	//check if the mentioned user is registrated
            message.react('❓');
            return;
        }
        message.reply(`Discord handle: **${target.username}** and on riichi city **${registrants[target.id].gameName}**`);
        return;
    }
    let command = message.content.replace('?who ', '').toLowerCase();
    for(const [key, registrant] of Object.entries(registrants)){
		//search by usernames
		let nohashtag = getusernameWOhashtag(registrant.discordName).toLowerCase();
		if(registrant.discordName.toLowerCase() == command || nohashtag == command || registrant.gameName.toLowerCase() == command){
			target = registrant;
			break;
		}
		//Check for discord id or riichi city code
		if(key == command || registrant.gameID == command){
			target = registrant;
			break;
		}
}
    if(target != -1){
        message.reply(`Discord handle: **${target.discordName}** and on riichi city **${target.gameName}**`);
        return;
    }else{
        message.react('❓');
        return;
    }
}

function getusernameWOhashtag(username){
	//remove discriminator portion of discord usernames eg. Klorofinmaster#9001 -> Klorofinmaster
	//discriminators are always 4 digits, so we remove the 5 last characters from their name.
	let fixUsername = username.substring(0,username.length-5);
    return fixUsername;
}
module.exports = whois; //assigns the function whois to run when this script is called.
