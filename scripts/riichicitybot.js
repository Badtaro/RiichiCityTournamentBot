const https = require('https');
const requests = require('../requests/requests.js');
const fs = require('fs');
const data = require('./datahandler.js');
const discordBot = require('./discordBot.js');
const config = require('../config.js');
const score = require('./score.js');
const { x64 } = require('crypto-js');
const matches = require('../commands/matches.js');

let targetlog = 'ccetv969nc7di8ola31g'; // not used
let tournament;			//tournament settings
let classifyID = '';    //internal tournament reference
let started = false;

let theBotsStartTime =  new Date; 
//Keep these as separate entities, solely so we can call
//gameIds.Include(ID) to make later functions easy breezey
let gameIDs = [];
let games = [];
let Timer;
let playerStatus = [];
let autoMatchList = {};

/*
Usual pipeline here:
Called by Index.js -> does setup() -> login and setup -> discordBot.js steps
-> update() which is a loop that runs for forever.
*/


//setup prerequistes
async function setup(){
    await login().catch(err => errorThrower(err));
    score.setup();
    await loadMatches().catch(err => errorThrower(err));
    await discordBot.setup().catch(err => errorThrower(err));

    //I feel pretty stupid, so I can't think of a better way to do this
    // Basically we recorded the time the bot went online, if it has been more than 10 minutes
    //since then, then don't put them on the tardy list. 
    //Need to acquire post qualifiers start time to find out where we are.
    theBotsStartTime =  Date.now();

    //discordBot.checkOngoing(await requests.fetchOngoingGames(classifyID));
    update(true);
}
//login to riichi city and save tournament info
function login(){
    return new Promise(async (resolve, reject) =>{
        await requests.login().catch(err => reject(err));
        const res = await requests.fetchTournament(config.tournamentID).catch(err => reject(err));
        tournament = res;
        classifyID = res.classifyID;
        console.log(`currently managing: ${res.matchInfo.name}`);
        resolve(1);
    });
}
//This is the update script
async function update(){
    /* this should be run everytime we want to update the tournament
     * this function will:
     *      check what stage the tournament is at and run the relevant update sequence
     * 
     *      check for players readied up 
     *      check for new completed games
     *      update scoreboards
     *      start itself in x seconds, where x is how often it should do so in milliseconds
	 * 		the latter part is done in the relevant functions that are executed
     */
    const stage = getStage();

//load the matches only once. Everytime you update this file you need to restart the bot, annoying I know. 
//I'll fix it later
    if(Object.keys(autoMatchList).length === 0)
    {
        autoMatchList = await data.loadPostQMatches().catch(err => reject(err));
    }

    updatePostQualifiers(stage);

}

//update tournament before qualifiers start
function updatePrequalifiers(stage){
    const timetowait = timeLeft();
    Timer = setTimeout(update,timetowait);
    let now = new Date();
    let date = new Date(now.getTime() + timetowait);
    console.log(`Tournament hasn't started yet, starts in: ${timetowait}ms\nThis is at ${date.toUTCString()}`);
    discordBot.updateStandings(stage);
}
//update tournament during qualifiers
async function updateQualifiers(stage){
    //check whether players are ready and if they are, start games
    //do this before updating standings. because then you also get the updated player list
    let playersReady = await isPlayersReady();
    //if(playersReady.length >= config.gamemode) await initiateGames(playersReady);

    //check for new games in tournament and if they are, update standings
    let newgames = await hasNewGames();
    await discordBot.updateStandings(stage,newgames);
    
    //run this function again in the specified time interval
    Timer = setTimeout(update,config.updateInterval);
}
//update tournament before finals start
async function updatePrePostQualifiers(stage){
    const timetowait = timeLeft();
    Timer = setTimeout(update,timetowait);
    let now = new Date();
    let date = new Date(now.getTime() + timetowait);
    console.log(`Post Qualifiers hasn't started yet, starts in: ${timetowait}ms\nThis is at ${date.toUTCString()}`);
    let newgames = await hasNewGames();
    await discordBot.updateStandings(stage,newgames);
}
//update tournament during finals
async function updatePostQualifiers(stage){
    //in the finals we need to do this the other way around, since we check for the amount of games played, this could lead to players playing more games than intended.

    //we will pass the newgames array as usual, we let the discordbot portion handle the correct sorting of the games
    let playersReady = await isPlayersReady(); //This updates the playerStatus array, we want to push the updated version to the embeds
    let newgames = await hasNewGames();
    await discordBot.updateStandings(stage,newgames);

    /* this should check whether finalists are readied up and start their table if they are */
    await postQualifiersMatchmaking(playersReady);
    Timer = setTimeout(update,config.updateInterval);
}
//get the current stage of the tournament
function getStage(){
    /* Find current stage of tournament */
    //crate date objects for dates
    let timeObj = generateTimeObj();

    //Find the current stage
    if(timeObj[3].getTime() < timeObj[0].getTime()) return 0;   //tournament haven't started yet
    if(timeObj[3].getTime() < timeObj[1].getTime()) return 1;   //qualifiers has started, but not ended yet
    if(timeObj[3].getTime() < timeObj[2].getTime()) return 2;   //qualifiers has ended
    if(timeObj[3].getTime() >= timeObj[2].getTime())return 3;   //post-qualifiers has started

    return -1   //this point should never be reached
}
//get remaining time of current stage in ms
function timeLeft(){
    /* Get remainding time(ms) of current stage */
    let currentStage = getStage();
    let timeObj = generateTimeObj();

    if(currentStage != -1 || currentStage == (timeObj.length - 1)){
        //returns time remaining of the current stage
        return timeObj[currentStage].getTime() - timeObj[3].getTime();
    }else{
        //this is undefined territory, very spooky if hit
        return  -1;
    }
}
//build time object, which is used to figure out stages and stuff
function generateTimeObj(){
    let tourney_qualifier_start = new Date();
    let tourney_qualifier_end = new Date();
    let tourney_post_qual_start = new Date();
    let current_time = new Date();
    
    //configure date objects
    tourney_qualifier_start.setFullYear(config.startDate.year,config.startDate.month,config.startDate.day);
    tourney_qualifier_end.setFullYear(config.endDate.year,config.endDate.month,config.endDate.day);
    tourney_post_qual_start.setFullYear(config.postQualifiersDate.year,
        config.postQualifiersDate.month,config.postQualifiersDate.day);

    tourney_qualifier_start.setHours(config.startDate.hour,config.startDate.minutes,config.startDate.seconds,config.startDate.milliseconds);
    tourney_qualifier_end.setHours(config.endDate.hour,config.endDate.minutes,config.endDate.seconds,config.endDate.milliseconds);
    tourney_post_qual_start.setHours(config.postQualifiersDate.hour,
        config.postQualifiersDate.minutes,config.postQualifiersDate.seconds,
        config.postQualifiersDate.milliseconds);

    return [tourney_qualifier_start,tourney_qualifier_end,tourney_post_qual_start,current_time];
}

//Returns the StageRound of the game that has the lastest endTime from this PlayerName (nickname)
function getMostRecentStage(playerId,gamelist)
{
    let latestEndTime = 0;
    let latestStageRound = "Qualifiers";
    
    let filteredGames = gamelist.filter( value =>
        value.players[0].userId === playerId  ||
        value.players[1].userId === playerId  ||
        value.players[2].userId === playerId  ||
        value.players[3].userId === playerId
         )

    //loops through filtered games, if endTime is bigger than another it's stageRound overwrites
    for (const currentGame of filteredGames )
    {
        if(latestEndTime<currentGame.endTime)
        {
            latestEndTime = currentGame.endTime;
            latestStageRound = currentGame.stageRound;
        }
    }
    return latestStageRound;
}


function getStageTableId(stage,playerId, gameList){

    //Filters games to be stage requested, and then pulls
    //all games associated with the player also provided.
    //ex: 64B, BillyBob -> Returns max 3 games.
    let filteredGames = gameList.filter( value =>
        value.stageRound === stage &&
        (
            value.players[0].userId === playerId  ||
            value.players[1].userId === playerId  ||
            value.players[2].userId === playerId  ||
            value.players[3].userId === playerId
        )
    )
    if(filteredGames.length > 3)
    {
        console.log("O h N o. Somehow someone has more than 3 games in a stage");
    }
    if(filteredGames.length > 0)
    {
        //The table id's should all be the same so just pick [0].
        return filteredGames[0].tableID;
    }
    else{
        return -1; //New table ID since none exist yet.
    }

}

//check for new games
function hasNewGames(){
	//fetch and cache new games, then return the new ones
    return new Promise(async (resolve,reject) =>{
        let index = 0;
        let dupe = false;
        let newGames = [];


        let postQualifiers =  new Date();
        //set the date field to have the right year and hours. It is 
        //weird I agree
        postQualifiers.setFullYear(config.postQualifiersDate.year,
            config.postQualifiersDate.month,config.postQualifiersDate.day);
        postQualifiers.setHours(config.postQualifiersDate.hour,
            config.postQualifiersDate.minutes,config.postQualifiersDate.seconds,
            config.postQualifiersDate.milliseconds);
        

        while(!dupe){
            const tourneyGames = await requestGames(index).catch(err => reject(err));
            for(const tourneyGame of tourneyGames){

                //Obtains the player in 1st, this does not matter, we just need a playername
                let playerId = tourneyGame.players[0].userId;
                //Find the stage that is most recent for the player
                let currentStage = getMostRecentStage(playerId, games);

                //If last game played was qualifiers they are either first game A block or B block
                if(currentStage === 'Qualifiers')
                {
                    tourneyGame["stageRound"] = "32";
                    tourneyGame["tableID"] = tourneyGame.paiPuId;

                }
                //We are past qualifiers then we need to see if three games have been played
                //if so we are in the next stage.
                else{
                    //Gathers games under this player under latest stage
                    var gameCount = games.filter(value => value.stageRound === currentStage
                        && (
                            value.players[0].userId == playerId  ||
                            value.players[1].userId == playerId  ||
                            value.players[2].userId == playerId  ||
                            value.players[3].userId == playerId
                        )).length;
                    //if below three we are still in that stage
                    if(gameCount < 3)
                    {
                        //find the ID associated with this player and this stage.
                        let currentTableID = getStageTableId(currentStage,playerId,games);

                        tourneyGame["stageRound"] = currentStage;
                        if(currentTableID===(-1)){
                            currentTableID=tourneyGame.paiPuId;
                        }
                        tourneyGame["tableId"] = currentTableID;
                    }
                    //if above(shouldn't be possible) or at 3, we are in the next stage
                    else
                    {
                        let currentStageNum = 0;
                        //Gains the number from the stage, ex: 64 - > 64
                            currentStageNum = parseInt(currentStage);

                        currentStageNum = currentStageNum/2; //64 -> 32
                        let newStage = "";
                        newStage = currentStageNum.toString();

                        //sets it.
                        tourneyGame["stageRound"] = newStage;
                        tourneyGame["tableId"] = tourneyGame.paiPuId;
                    }
                }
                
                if(!gameIDs.includes(tourneyGame.paiPuId)){
                    gameIDs.push(tourneyGame.paiPuId);
                    games.push(tourneyGame);
                    newGames.push(tourneyGame);
                }else{
                    dupe = true;
                }
            }
            if(!dupe){
                //riichi city provides max 20 records at a time
                index += 20;
            }
            if(tourneyGames.length < 20) dupe = true;  // set dupe to true, because there won't be more matches if we reach limits
        }
        newGames = sortgames(newGames);
        games = sortgames(games);
        await saveMatches();
        resolve(newGames);
    });
}
//sort games chronologically
function sortgames(arr){
    arr.sort((a,b) =>{
        if(a.endTime == b.endTime) return 0;
        return a.endTime < b.endTime ? -1 : 1;
    });
    return arr;
}
//fetch games with index
function requestGames(lastindex = 0){
    return new Promise(async (resolve,reject) =>{
        resolve(await requests.fetchTournamentLogList(classifyID,lastindex).catch(err => reject(err)));
    });
}
//returns a list over userIDs which are readied up
function isPlayersReady(){
    return new Promise(async (resolve,reject) =>{
        let readyPlayers = [];
        playerStatus = await requests.fetchTournamentPlayers(config.tournamentID);
        for(const entry of playerStatus){
            if(entry.status == 2) readyPlayers.push(entry.userID); // status 2 -> readied up
        }
        resolve(readyPlayers);
    });
}

//returns a list over userIDs which are in a game
function isPlayersInGame(){
    return new Promise(async (resolve,reject) =>{
        let playersInGame = [];
        playerStatus = await requests.fetchTournamentPlayers(config.tournamentID);
        for(const entry of playerStatus){
            if(entry.status == 3) playersInGame.push(entry.userID); //status 3 -> in game
        }
        resolve(playersInGame);
    });
}
//initiate games with given player pool that are readied up
async function initiateGames(readyPlayers){
    //this starts a number of games that can be started depending on the amount of ready players
    //this should be updated to ensure people queueing up early get placed into a game first

    //randomize ready players
    let shuffledPlayers = readyPlayers
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    let games = [];
    let tmp = [];
    //pull out enough players for a table at a time
    for(const player of shuffledPlayers){
        tmp.push(player);
        if(tmp.length >= config.gamemode){
            games.push(tmp);
            tmp = [];
        }
    }
    //this function should only run when enough players are ready anyway, so we should assume to start at least one match at this point
    for(const table of games){
        await startShuffledGame(table);
    }
    await updatePlayerList();
}
//matchmaking for finalists
async function postQualifiersMatchmaking(readyPlayers){
    //final matchmakings
    //check if we have enough players from the same table to start a match
    //check if they have played the amount of hanchans needed
    let postQPlayers = discordBot.getPostQualifiers();

    //Gain list of people in Game so we don't bug them if they are in a game.
    let playersInGame = await isPlayersInGame(); 
    let currentTime = Date.now();
    let tardylist = []; //list of players that will be declared tardy.

    for(const [key,value] of Object.entries(autoMatchList) )
    {   
        //Amount of rounds this table has already experienced.
        let amountOfRounds = 0;
        let tardyTime = theBotsStartTime/1000;

        //safety check. If it isn't there then we are game 1 and we want amountOfRounds to be 0.
        if(postQPlayers[value[0].playerEastDiscordID] !== undefined)
        {
            if(postQPlayers[value[0].playerEastDiscordID].stage[value[0].stageRound] !== undefined)
            {
                amountOfRounds = postQPlayers[value[0].playerEastDiscordID].stage[value[0].stageRound].scores.length;
                tardyTime = postQPlayers[value[0].playerEastDiscordID].stage[value[0].stageRound].gameEndTime;
                
                if(tardyTime > 16000000000)
                {
                    tardyTime = tardyTime / 1000 //I am stupid and forget what format the endtime is
                }

            }

        }
        
        //If the Amount of Rounds played for this table is below our desired number, that means 
        //there are more rounds for them to play.
        if(amountOfRounds<3)
        {
            //ready players contains all four players for this player
            if(readyPlayers.includes(parseInt(value[0].playerEastRCID))
                && readyPlayers.includes(parseInt(value[0].playerSouthRCID))
                && readyPlayers.includes(parseInt(value[0].playerWestRCID))
                && readyPlayers.includes(parseInt(value[0].playerNorthRCID))
            )
            {
                console.log('starting match');
                let sortedPlayers = [value[amountOfRounds].playerEastRCID,value[amountOfRounds].playerSouthRCID,value[amountOfRounds].playerWestRCID,value[amountOfRounds].playerNorthRCID];
                await startSortedGame(sortedPlayers);
                //discordBot.announceGameStart(tableID);
            }
            else //1 or more players for the table aren't readied up.
            {   
                //the first number here is the amount of minutes someone can be late
                if(((currentTime/1000)-tardyTime) > 15*60)
                {
                    //If a player is not in the ready list and not in the in game list, they go on the tardy list
                    if(!readyPlayers.includes(parseInt(value[0].playerEastRCID))
                    && !playersInGame.includes(parseInt(value[0].playerEastRCID))
                    )
                    {
                        tardylist.push(value[0].playerEastDiscordID)
                    }
                    if(!readyPlayers.includes(parseInt(value[0].playerSouthRCID))
                        && !playersInGame.includes(parseInt(value[0].playerSouthRCID))
                    )
                    {
                        tardylist.push(value[0].playerSouthDiscordID)
                    }
                    if(!readyPlayers.includes(parseInt(value[0].playerWestRCID))
                        && !playersInGame.includes(parseInt(value[0].playerWestRCID))
                    )
                    {
                        tardylist.push(value[0].playerWestDiscordID)
                    }
                    if(!readyPlayers.includes(parseInt(value[0].playerNorthRCID))
                        && !playersInGame.includes(parseInt(value[0].playerNorthRCID))
                    )
                    {
                        tardylist.push(value[0].playerNorthDiscordID)
                    }
                }
                
            }
        }
    }
    console.log('tardy list:');
    console.log(tardylist);
/*
    if(tardylist.length > 0)
    {
        discordBot.announceTardiness(tardylist);
    }*/
}

//start a single game with non-shuffled. East is first in array given
function startSortedGame(sortedPlayers){
    //this starts a single game
    return new Promise((resolve,reject) =>{
        console.log(sortedPlayers);
        requests.startTournamentGame(sortedPlayers,config.tournamentID).then(()=>resolve(1)).catch(err => reject(err));
    });
}


//start a single game with shuffled players
function startShuffledGame(readyPlayers){
    //this starts a single game
    return new Promise((resolve,reject) =>{
        let shuffledPlayers = readyPlayers
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
        requests.startTournamentGame(shuffledPlayers,config.tournamentID).then(()=>resolve(1)).catch(err => reject(err));
    });
}
//update player status list
function updatePlayerList(){
    return new Promise(async (resolve,reject) =>{
        playerStatus = await requests.fetchTournamentPlayers(config.tournamentID).catch(err => reject(err));
        resolve();
    });
}
//fetch a game log, not used in this bot, but might be used in case someone wants to give bonus points for specific yakus and the likes
function fetchGame(){
	return new Promise(async resolve =>{
        const res = await requests.fetchLog(targetlog);
        data = JSON.stringify(res, null, 2);
        fs.writeFile(`./games/${targetlog}.json`,data,async (err) =>{
            if(err) throw err;
            resolve();
        });
    });
}
//fetch and parse the cached games object
function loadMatches(){
    return new Promise(async(resolve,reject) =>{
        const gamesjson = await data.rcDataLoad();
        //Loops through all objects in current matches.json, loads them into 
        //games[] and gameIds if it has a PaiPuId (Basically game id)
        for(const [key, game] of Object.entries(gamesjson)){
            if(!game.hasOwnProperty("paiPuId")){
                console.log(game);
                console.log(gamesjson);
                //throw new Error("game object empty!");
            }
            
            games.push(game);
            gameIDs.push(game.paiPuId);
        }
        resolve();
    });  
}
//save the cached game object
function saveMatches(){
    return new Promise(async(resolve,reject) =>{
        await data.rcDataSave(games).catch(err => reject(err));
        resolve();
    });
}
//make the games object available for other scripts
function getGames(){
    //fetch games for other scripts
    return games;
}
//make the players object available for other scripts
function getPlayers(){
    //fetch games for other scripts
    return playerStatus;
}
//make the internal tournament string available for other scripts
function getTourneyString(){
    return classifyID;
}
//make the tournament settings available for other scripts
function getTourneySettings(){
    return tournament;
}
//genereal error handler
function errorThrower(err){
    throw err;
}

exports.setup = setup;
exports.getGames = getGames;
exports.getPlayers = getPlayers;
exports.getTourneyString = getTourneyString;
exports.getTourneySettings = getTourneySettings;