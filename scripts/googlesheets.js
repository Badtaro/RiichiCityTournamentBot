//const sheets = require('google-spreadsheet');
const config = require('../config');
//take a look at https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication how to authenticate a bot account
//const credentials = require('../<GOOGLE CREDENTIALS>.json'); 
//spreadsheet unique identifier, it's the part at the end of the link, remember to give your bot write access to the doc
const streamDoc = new sheets.GoogleSpreadsheet('1-CaF8VttU9OSjgz16FPg218EMf9HDlRnyXFTzkvO6U0');
const dataranges = [];

const loadStreamArea = 'A1:B14';
const streamColOffset = 2;  //width of the data matrix (playername,score)
const tablenum = [8,4,2,1];
const stagenames = ['Semi-finals','Finals'];


let contest = {};

function setup(){
    return new Promise(async (resolve, reject) =>{
        await login().catch(err => reject(err));
        await streamDoc.loadInfo(); // loads document properties and worksheets
        console.log(`Logged into google spreadsheets and is monitoring "${streamDoc.title}"`);
        resolve();
    });
}
function login(){
    return new Promise(async (resolve, reject) =>{
        await streamDoc.useServiceAccountAuth(credentials).catch(err => reject(err));
        resolve();
    });
}
async function delayUpdateSheet(players,finalists,delayms){
    return new Promise(async (resolve, reject) =>{
        const rawSheet = streamDoc.sheetsByTitle['Raw'];    //get the "raw" tab of the document
        await rawSheet.loadCells(loadStreamArea);           //load the portion we want to write to
        for(const [key,table] of Object.entries(finalists)){
            let x = 0 //horizontal value (Letters)
            let y = parseInt(table.table) * config.gamemode;    //vertical value (numbers)
            const tablestandings = table.getStandings();
            for(const player of tablestandings){
                let namecell = rawSheet.getCell(y,x);
                let pointcell = rawSheet.getCell(y,x + 1);  //points are to the right of the name
                if(player[0] < 0){
                    namecell.value = `TBD - winner of table ${-parseInt(player[0])}`;   //update name
                }else{
                    namecell.value = players[player[0]].gameName;   //update name
                }
                pointcell.value = `${player[1]/1000} (${player[2]/1000})`;    //update score
                y++; //increment vertical value
            }
        }
        //mark a timestamp at the bottom of the raw sheet when the update was issued
        let inittimestampcell = rawSheet.getCell(13,0);
        inittimestampcell.value = new Date().toISOString();
        setTimeout(()=>{
            let executetimestampcell = rawSheet.getCell(13,1);
            executetimestampcell.value = new Date().toISOString();
			rawSheet.saveUpdatedCells();
		},delayms);
        resolve();
    });
}

exports.setup = setup;
exports.delayUpdateSheet = delayUpdateSheet;