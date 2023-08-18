const fs = require('fs');
const requests = require('./requests/requests.js');
const data = require('./scripts/datahandler.js');
//get usernames riichi city
let registrants = {};

async function setup(){
    await requests.login().catch(err => reject(err));
    registrants = await data.loadContestants();
    await addUsernames();
    await saveNewregistrants();
}
async function addUsernames(){
    return new Promise(async (resolve, reject) => {
        for(const [key,registrant] of Object.entries(registrants)){
            const res = await requests.findPlayer(registrant.gameID);
            registrants[key].gameName = res.friendList[0].nickname;
        }
        resolve();
    });
}
function saveNewregistrants(){
    return new Promise((resolve,reject) =>{
        let text = '';
        for(const [key,entry] of Object.entries(registrants)){
            text += `${entry.discordID}\t${entry.gameID}\t${entry.sakiChar}\t${entry.discordName}\t${entry.gameName}\n`;
        }
        fs.writeFile('./registrants.txt',text,'utf-8', (err) =>{
            if(err) throw err;
        });
    });
}

setup();