/*************************************************************************************************
 * This portion is very propriotary, but it loads games and parses them for stats
 * not gonna bother commenting much of this because it's not finished yet
 *************************************************************************************************/


const rcGamelog = require('./rcGameLogV2.js');
const requests = require('../requests/requests.js');
const config = require('../config.js');
const data = require('./datahandler.js');
const fs = require('fs');

let tournament;
let classifyID;
let matchDataNames;
let gameloglist;
let paipulist;
let gamelogFull = [];
let playerstats = {};
let gamestats = {};
let timeStats = [];
let path = './games/cdehbgeai08em49ktagg.json';

const sensitivity = 60000; //in ms

async function setup(){
    //login
    await login().catch(err => errorThrower(err));
    //load filenames of cached games
    matchDataNames = await data.statLoad().catch(err => errorThrower(err));
    begin();
}
async function begin(){
	//parseAll();
	parseOneGame();
}
async function parseOneGame(){
	fs.readFile(path,(err,data) =>{
		if(err) throw err;
		let game = JSON.parse(data);
        rcGamelog.parse(game,{},{});
	});
}
async function parseAll(paifulist){
	gameloglist = await getLogs();
    paipulist = parseMatchList(gameloglist);
    await downloadLogs(paipulist); //add ",true" to force redownload any logs
    for(const log of gamelogFull){
        //[playerstats,gamestats] = await 
        rcGamelog.parse(log,playerstats,gamestats);
		//let stat = await rcGamelog.timeStats(log);
        //timeStats.push(stat);
    }
    findPrizes(playerstats);
    //parseTime();
    let yakuman = rcGamelog.getYakuman();
    //console.log(playerstats);
    rcGamelog.savePlayers(playerstats);

}
function findPrizes(Players){
    let saki = [];
    let kuro = [];
    let toki = [];
    let teru = [];
    let grind = [];
    const sort = (a,b) =>{
        if(a[1] == b[1]) return 0;
        return a[1] > b[1] ? -1 : 1;
    }
    for(const [key,player] of Object.entries(Players)){
        saki.push([key,player.saki]);
        toki.push([key,player.toki]);
        kuro.push([key,player.kuro]);
        teru.push([key,player.teru]);
        grind.push([key,player.rounds.length])
    }
    saki.sort(sort);
    kuro.sort(sort);
    toki.sort(sort);
    teru.sort(sort);
    grind.sort(sort);
    //console.log(Players['313620865']);
    console.log(`Saki award: ${Players[saki[0][0]].game_name}\t${saki[0][0]}\t - ${saki[0][1]} Rinshan kaihous`);
    console.log(`Kuro award: ${Players[kuro[0][0]].game_name}\t${kuro[0][0]}\t - ${kuro[0][1]} Doras in one hanchan`);
    console.log(`Toki award: ${Players[toki[0][0]].game_name}\t${toki[0][0]}\t - ${toki[0][1]} Riichi Ippatsu Tsumo`);
    console.log(`Teru award: ${Players[teru[0][0]].game_name}\t${teru[0][0]}\t - ${teru[0][1]} Consecutive wins`);
    console.log(`Ultimate grinder award: ${Players[grind[0][0]].game_name}\t${grind[0][0]}\t - ${grind[0][1]} Hands played`);
}
function parseTime(){
    let min = 99999999999999;
    let max = 0;
    let sum = 0;
    let occur = {};
    let hyp = [];
    for(const time of timeStats){
        if(time < min) min = time;
        if(time > max) max = time;
        sum += time;
        const entry = Math.round(time / sensitivity) * sensitivity; //round to nearest sensitivity
        if(occur.hasOwnProperty(`${entry}`)){
            occur[`${entry}`] += 1;
        }else{
            occur[`${entry}`] = 1;
        }
    }
    for(const [key,entry] of Object.entries(occur)){
        hyp.push([parseInt(key),entry]);
    }
    hyp.sort((a,b) =>{
        if(a[1] == b[1]) return 0;
        return a[1] < b[1] ? 1 : -1;
    });
    const average = sum/timeStats.length;
    console.log(`
    Average match duration: ${convertTime(average)}
    Shortest match: ${convertTime(min)}
    Longest match: ${convertTime(max)}
    Median match duration: ${convertTime(hyp[0][0])} Occured ${hyp[0][1]} times (rounded to nearest minute)
    `)
    for(const entry of hyp){
        console.log(`${convertTime(entry[0])} Occured ${entry[1]} times`);
    }
}
function convertTime(ms){
    const minutes = Math.floor(ms/60000);
    const seconds = Math.floor((ms - (minutes * 60000))/1000);
    if(minutes && seconds) return `${minutes} minutes and ${seconds} seconds.`;
    if(minutes && !seconds) return `${minutes} minutes.`;
    if(!minutes && seconds) return `${seconds} seconds.`;
    if(!minutes && !seconds) return '';

}
function login(){
    return new Promise(async (resolve, reject) =>{
        await requests.login().catch(err => reject(err));
        const res = await requests.fetchTournament().catch(err => reject(err));
        tournament = res;
        classifyID = res.classifyID;
        console.log(`Downloading logs from: ${res.matchInfo.name}`);
        resolve();
    });
}
function getLogs(){
    return new Promise(async (resolve,reject) =>{
        let index = 0;
        let dupe = false;
        let games = [];
        while(!dupe){
            const tourneyGames = await requests.fetchTournamentLogList(classifyID,index).catch(err => reject(err));
            for(const tourneyGame of tourneyGames){
                games.push(tourneyGame);
            }
            if(tourneyGames.length < 20) dupe = true;   //exit loop
            index += 20;
        }
        resolve(games);
    });
}
function parseMatchList(logs){
    let paipus = [];
    for(const tourneyGame of logs){
        paipus.push(tourneyGame.paiPuId)
    }
    return paipus;
}
async function downloadLogs(paipus,force = false){
    let i = 0;
    for(const paipu of paipus){
        i++;
        console.log(`fetching log ${paipu}\t${i} / ${paipus.length}`);
        gamelogFull.push(await rcGamelog.downloadGame(paipu,force));
        //await delay(1000);
    }
    gamelogFull = gamelogFull.reverse();
}
function delay(ms){
    return new Promise(resolve =>{
        setTimeout(()=>resolve,ms);
    });
}

function errorThrower(err){
    throw err;
}

exports.setup = setup;