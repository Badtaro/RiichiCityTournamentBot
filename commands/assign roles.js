const config = require('../config');
const dcbot = require('../scripts/discordBot.js');

async function assignRoles(message){
    //give participation role to all registrated players

	//this command is admin locked
    if(!config.superAdmins.includes(message.author.id)){
        message.react('❌');
        return;
    }
    const registrants = dcbot.getRegistrants();
	//this command is slow, so we will start with a hourglass react to let you know that it's processing the command
    await message.react('⏳');
    let i = 0;
    const indexmax = Object.entries(registrants).length;
    for(const [userid, user] of Object.entries(registrants)){
        i++;
        let flag = false;
        const guildmember = await fetchUser(message.guild,userid).catch(err =>{
            console.log(`${userid} was not found in the server`);
            flag = true;
        });
        if(flag) continue;
        if(!guildmember.roles.cache.has(config.participantRole)){
            console.log(`giving role ${i} of ${indexmax}`);
            await guildmember.roles.add(config.participantRole);
        }else{
            console.log(`user already has role ${i} of ${indexmax}`);
        }
    }
    message.react('✅');
}
function fetchUser(guild,userid){
	//fetch a guildmember object from a discord guild (server object)
    return new Promise(async (resolve, reject) =>{
        const guildmember = await guild.members.fetch(userid).catch(err => reject(err));
        resolve(guildmember);
    });
}

module.exports = assignRoles;