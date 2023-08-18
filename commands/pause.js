//pause request game

//side note this script should be refactored, we shouldn't have to import any of these scripts, it makes everything a spiders web.
//code should branch out and never cross, this does just that and it's hideous.

const dcbot = require('../scripts/discordBot.js');
const rcbot = require('../scripts/riichicitybot.js');
const requests = require('../requests/requests.js');
const config = require('../config.js');

let pauses = {};

async function pause(userID){
	// Pause/unpause the game target player is playing

    const game = await findGame(userID).catch(err => { //fetch game where this user is playing
        dcbot.logMessage({content: `An error occurred: \n${err}`});
        throw err;
    });
    if(game == -1){ //couldn't find game
        dcbot.logMessage({content: `Can't find a game where <@${userID}> is playing`});
        return;
    }

    if(pauses.hasOwnProperty(game.roomId)){ //check if game has recently been paused/unpaused
		//this is here to avoid multiple people pausing at the same time, because this would lead to the game being resumed again.
		//remember riichi city only pauses the game after the next action after the pause is issued, which makes this into a bigger issue.
        dcbot.logMessage({content: `Pause/unpause is still on cooldown!`});
        return;
    }
    pauses[game.roomId] = true;	//set a timeout flag
    setTimeout(()=>{delete pauses[game.roomId]},config.pauseInterval);	//clear it after the pause interval
    const type = game.isPause ? 2 : 1; //2 is unpause, 1 is pause. if it's paused we want to unpause it, if it's not then we want to pause it
    const res = await requests.manageTournamentGame(game.roomId,type, config.tournamentID).catch(err =>{
        dcbot.logMessage({content: `An error occurred: \n${err}`});
        throw err;
    });
    if(!res){
        dcbot.logMessage({content:`failed to pause gameid: ${game.roomId} - issued by: <@${userID}>`})
    }
    let players = listDiscordPingPlayers(game.players);
    players += `issued by: <@${userID}>`;
    let ps = [null,'**Paused**','**Resumed**'];
    let txt = `${ps[type]} game with ID: *${game.roomId}* and players *${players}*`;
    dcbot.logMessage({content: txt});
}

function findGame(discordID){
	//find the gameID that the target player is playing

    return new Promise(async (resolve, reject) =>{
        const registrants = dcbot.getRegistrants();
        if(!registrants.hasOwnProperty(discordID)){
            resolve(-1);  //not registrated in tournament, disregard
        }else{
            const tourneyString = rcbot.getTourneyString();
            const authorGameID = registrants[discordID].gameID;	//get the discord ID of the user issuing the pause
            const ongoingGames = await requests.fetchOngoingGames(tourneyString).catch(err => reject(err));
            for(const game of ongoingGames){
                for(const player of game.players){
                    if(player.userId == authorGameID){
                        resolve(game);
                    }
                }
            }
            resolve(-1);
        }
    });
}

function listDiscordPingPlayers(players){
    //list players in a discord ping string format <@discordID>, <@discordID>, <@discordID>

    let registrants = dcbot.getRegistrants();
    let txt = '';
    for(const player of players){
        let discordID = '-1';
        for(const [key,value] of Object.entries(registrants)){
            if(value.gameID == player.userId){
                discordID = key;
                break;
            }
        }
        txt += `${player.nickname}(<@${discordID}>), `;
    }
    txt.substring(txt.length -3, txt.length);	//remove the last comma
    return txt;
}
module.exports = pause;	//assigns the function pause to run when this script is called.