const Discord = require('discord.js');
const config = require('../config');
const data = require('./datahandler.js');
const rcBot = require('./riichicitybot.js');
const funcs = require('./functions.js');
const score = require('./score.js');
//const sheets = require('./googlesheets.js'); //delete if we aren't using google sheets.
const pause = require('../commands/pause.js');
const matchlist = require('../commands/matches.js');
const me = require('../commands/me.js');
const assignRoles = require('../commands/assign roles.js');
const whois = require('../commands/whois.js');

let players = {};
let registrants = {};
//Players who made it past qualifiers stage.
let PostQPlayers = {};
let logChannel;
let standingsChannel;
let announceChannel;
let reported = [];
let finalmessageposted = true;

//REMEMBER TO FILL THESE IN!!! Or message.edit will not work
let standingMessages = [];



const client = new Discord.Client({ intents: [
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.GuildEmojisAndStickers,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.Guilds,
]});

//set up the prerequisites
function setup(){
    return new Promise(async (resolve,reject) => {
        await client.login(config.pass).catch(err => reject(err));  //log into discord
        await setupChannels();  //load discord channels
        await cachePauseMessage();  //load pause message into cache, otherwise we can't listen in to reacts to it
        await buildAndVerifyObjects()   //prepare objects

        await checkMembersInServer();
		//await once();		//Only run this line once!! COMMENT OUT once ran once.
        resolve(1);
    });
}
//run this once when you set up the bot, it will generate messages you can use for displaying stats, simply uncomment the line in setup() and comment it out after running the script once
function once(){
    return new Promise(async (resolve,reject) =>{
		//this assumes you've made a message and a channel to pause games
        const chnl = await client.channels.fetch(config.pauseChannel);
        const msg = await chnl.messages.fetch(config.pauseMessage);
        //await msg.react('⏯️');
		//this assumes you have a channel for the leaderboards
		const leaderboard = await client.channels.fetch(config.standingsChannel);
		for(let i = 0; i < 10; i++){
			setTimeout(()=>{leaderboard.send(`${config.invisibleCharacter}`)},1000*i);	//wait 1 second between posts so that discord doesn't hate us
		}
		throw new Error(`Setup complete, now comment line 56! this will avoid making too many posts everywhere\nAlso copy the message id of all the posts in the leaderboard channel into the standingMessages array`)
        resolve();
    });
}

//use this function to give all participants a participant role in discord. Not Required
function giveRoles(){ 
    return new Promise(async (resolve,reject) =>{
        const guild = await client.guilds.fetch(config.guildID);
        const indexmax = Object.entries(registrants).length;
        let i = 0;
        for(const [key, uid] of Object.entries(registrants)){
            i++;
            const guildmember = await guild.members.fetch(key);
            if(!guildmember.roles.cache.has(config.participantRole)){
                console.log(`giving role ${i} of ${indexmax}`);
                guildmember.roles.add(config.participantRole);
            }
        }
        resolve();
    });
}

client.on('ready', () =>{
    console.log(`Logged in as ${client.user.tag}`);
});

//handle message events
client.on('messageCreate', message =>{
	if(message.author.bot)return;
    if(message.content.startsWith('?matches')){
        matchlist(message);
        return;
    }
    if(message.content.startsWith('?me')){
        me(message);
        return;
    }
    if(message.content.startsWith('?who')){
        whois(message,registrants);
        return;
    }
    if(message.content.startsWith('?assign roles')){
        assignRoles(message);
        return;
    }
	//test the final message, don't include this please lol
    if(message.content.startsWith('?testMessage')){
        if(config.superAdmins.includes(message.author.id)){
            let msg = buildFinalMessage();
            //logMessage(msg);
        }
    }
    if(message.content.startsWith('?testEnd')){
        if(config.superAdmins.includes(message.author.id)){
            updatePrefinals();
        }
    }
    if(message.content.startsWith('?update')){
        if(config.superAdmins.includes(message.author.id)){
            buildAndVerifyObjects().then(()=>{
                updateFinals([]).then(()=>{
                    message.react('✅');
                })
            })
        }
    }
});
//handle reactions
client.on('messageReactionAdd',(messageReaction,user) => react(messageReaction,user));
client.on('messageReactionRemove', (messageReaction,user) => react(messageReaction,user));

//build objects
function buildAndVerifyObjects(){
    return new Promise(async (resolve,reject) =>{
        registrants = {}; //reset just in case 
        PostQPlayers = {};   //reset just in case
        registrants = await data.loadContestants().catch(err => reject(err));   //get registred players
        

        buildObject(false);  //build the player object
        buildObject(true);  //add games to finalist object


        verifyregistrants();    //make sure players are in the servers, so the bot won't break
        resolve();
    });
}
//finals message. Probably delete or rewrite
function buildFinalMessage(){
    let playerstrings = getQualifiedPlayers();
    return `
    Thank you all for joining the qualifiers! Whale is dead inside after managing the tourney for the whole weekend.
    Congratulations to everyone who qualified! As a reminder you can find out who did in the #player-standings tab or in 
    Riichi City on the tournament page for the Whale Cup. 
    Whale will put up the match up's around Wednesday, stay tuned for updates on that end!
    The knock out stage will take place <t:1679065200:F> (<t:1679065200:R>) for Block A.
    The knout out stage will take place <t:1679094000:F> (<t:1679094000:R>) for Block B.
    If you are for some reason unable to play, please let Whale or another admin/manager know so we can work on getting a sub.
    Once again thank you for participating and good luck to everyone next weekend too.`
}
//fetch players that are qualified
function getQualifiedPlayers(){
    let valids = rankingPlayers();
    let qualified = config.amountOfQualifiers;
    let string = '';
    for(let i = 0; i < qualified; i++){
        const pl = valids[i];
        string += `<@${pl[0].discordID}>, `;
    }
    return string;
}

//handle pause requests here
function react(messageReaction,user){
    if(user.bot)return;
    if(messageReaction.message.id == config.pauseMessage){
        pause(user.id);
    }
}
//cache messages, this enables reaction events on messages that were posted before the bot went live.
function cachePauseMessage(){
    return new Promise(async (resolve,reject) =>{
        const chnl = await client.channels.fetch(config.pauseChannel);
        const msg = await chnl.messages.fetch(config.pauseMessage);
        resolve();
    });
}
//verify objects to avoid collisions.
//if any collisions are detected, I reccomend deleting the contents of the data.json and let the bot rebuild it.
function verifyregistrants(){
    //check for duplicate entries
    let uids = [];
    let gids = [];
    for(const [key,user] of Object.entries(registrants)){
        if(uids.includes(key)){
            console.log(`Duplicate user found!! check discord log`);
            logMessage(`duplicate discord registration <@${key}> (${key})`);
        }
        if(gids.includes(user.gameID)){
            console.log(`Duplicate game account found!! check discord log`);
            logMessage(`duplicate riichi city registration <@${key}> (${key} , ${user.gameID})`);
        }
        uids.push(key);
        gids.push(user.gameID);
    }
}


//check for games that are ongoing and manage the nag-flags
function checkOngoing(liveList){
	//this handles pinging players to remind them to get ready for matches.
	//TODO: make the bot not ping players when matches has concluded, but the bot is reset along with the match.json.
    if(!liveList.length) return;    //no need to do anything if no games are ongoing
    //this is only relevant if the current stage is eliminations, so we should check the current time
    let now = new Date();
    let postQualifiers =  new Date();
    //set the date field to have the right year and hours. It is 
    //weird I agree
    postQualifiers.setFullYear(config.postQualifiersDate.year,
        config.postQualifiersDate.month,config.postQualifiersDate.day);
    postQualifiers.setHours(config.postQualifiersDate.hour,
        config.postQualifiersDate.minutes,config.postQualifiersDate.seconds,
        config.postQualifiersDate.milliseconds);

    //Will return if postQualifiers is later than current day timestamp
    if(now.valueOf() < postQualifiers.valueOf())return; 

    //Post Qualifiers is in progress, we need to make sure we don't warn players of tardiness while they are ingame, that would be disruptive at best.
    for(const game of liveList){
        //we need to find an exact match between players and tables, this can be done by incrementing a counter everytime a table has a match with a player
        //and passing as true if the amount of matches corresponds with the gametype
        let tableID = -1;
        let matchnum = 0;
        let livePlayers = [];
        for(const player of game.players) livePlayers.push(player.userId);
        for(const [key,table] of Object.entries(finalists)){
            matchnum = 0
            for(const player of table.players){
                if(livePlayers.includes(player.RCID)){
                    matchnum++;
                }
            }
            if(matchnum == livePlayers.length){
                tableID = key;
                break;
            }
        }
        if(tableID != -1){
            //found a table match, we should set the next match flag to -1 again so that the players won't be nagged!
            //also set the nag flag just to be safe
            finalists[tableID].nextGame = -1;
            finalists[tableID].nagged = true;
        }else{
            //this might spell trouble, the bot isn't equipped with handling matches that aren't supposed to take place in the tournament!
            console.log(`WARNING, game in progress that is not in the list over active final matchmakings!`);
        }
    }
}

//verify that all the registrants are in the server. this is to prevent the bot from breaking in the middle of a tournament if someone leaves
async function checkMembersInServer(){
    //this will break if server has more than 1000 members
    const guild = await client.guilds.fetch(config.guildID);
    const guildmembers = await guild.members.fetch();

    for(const [key,registrant] of Object.entries(registrants)){
        const guildmember = guildmembers.get(key);
        if(typeof guildmember === 'undefined'){
            registrants[key].inserver = false;
            //Check to see that players has anyone in it at all
            //This would be empty if no matches have occurred yet.
            if(players[0] !== undefined)
            {
                if(Object.entries(players)[0].includes(key)){
                    players[key].inserver = false;
                    if(reported.includes(key)){
                        reported.splice(reported.indexOf(key),1);
                    }
                }
            }
            if(!reported.includes(key)){
                reported.push(key);
                console.log(`${registrant.discordName} (${key}) is no longer in the server`);
            }
        }else{
            registrants[key].inserver = true;
            //Check to see that players has anyone in it at all
            //This would be empty if no matches have occurred yet.
            if(players[0] !== undefined)
            {
                if(Object.entries(players)[0].includes(key)){
                    players[key].inserver = true;
                }
            }
        }
    }
    console.log(reported)
}

//build game object and append new games to it.
function buildObject(postQualifiers = false){
    let games = rcBot.getGames();
    //figure out if the game is valid
    //you do this by looking at the end date and see if it's after the final start time
    //you can then figure out which table it belongs to by examining the participants in that game
    //build postQualifiers date object
    let postQualifiersDate = new Date();
    postQualifiersDate.setFullYear(config.postQualifiersDate.year,config.postQualifiersDate.month,config.postQualifiersDate.day);
    postQualifiersDate.setHours(config.postQualifiersDate.hour,config.postQualifiersDate.minutes,config.postQualifiersDate.seconds,config.postQualifiersDate.milliseconds);

    for(const game of games){
        if(postQualifiersDate.valueOf()/1000 > game.endTime){ //not a final game
            if(!postQualifiers){
                addEntry(game); //add to qualifiers
            }
        }else{
            if(postQualifiers){
                addEntryPostQualifiers(game);   //add to PostQualifiers
            }
        }
    }
}
//add multiple entries to the qualifier game object
function updateObject(games){
    for(const game of games){
        addEntry(game);
    }
}
//add a single entry to the qualifier game object
function addEntry(game){
    let pos = 1;
    for(const gamePlayer of game.players){
        const registrant = findRegistrant(gamePlayer.userId);
        let gameID = gamePlayer.userId;
        let userID = registrant.discordID;
        let games = []; //not the global variable
        let gameIDs = [];
        let scores = [];
        let points = [];
        let positions = [];
        if(players.hasOwnProperty(userID)){
            games = players[userID].games;
            gameIDs = players[userID].gameIDs;
            scores = players[userID].scores;
            points = players[userID].points;
            positions = players[userID].positions;
            //if this player already has this match recorded, skip adding it to the record
            if(gameIDs.includes(game.paiPuId)){
                pos++;
                continue;
            }
        }
        games.push(game);
        gameIDs.push(game.paiPuId);
        scores.push(score.calculateScore(gamePlayer.points,pos));
        points.push(gamePlayer.points);
        positions.push(pos);
        players[userID] = {
            discordID: userID,
            discordName: registrant.discordName,
            RCID: gameID,
            gameName: registrant.gameName,
            scores: scores,
            points: points,
            positions: positions,
            gameIDs: gameIDs,
            games: games,
            inserver: registrant.inserver,
        }
        //add functions to those objects
        Object.assign(players[userID],funcs.scoreConsec);
        Object.assign(players[userID],funcs.scoreConsecForce);
        Object.assign(players[userID],funcs.scoreLast);
        pos++;
    }
}


//add multiple entries to the Post qualifiers game object
function updateObjectPostQualifiers(games, init){
    for(const game of games){
        addEntryPostQualifiers(game, init);
    }
}

//add a single entriy to the finals game object
function addEntryPostQualifiers(game, init = true){
    //figure out if the game is valid
    //you do this by looking at the end date and see if it's after the final start time
    //you can then figure out which table it belongs to by examining the participants in that game
    //build finalDate date object
    let PostQDate = new Date();
    PostQDate.setFullYear(config.postQualifiersDate.year,config.postQualifiersDate.month,config.postQualifiersDate.day);
    PostQDate.setHours(config.postQualifiersDate.hour,config.postQualifiersDate.minutes,config.postQualifiersDate.seconds,config.postQualifiersDate.milliseconds);

    if((PostQDate.valueOf()/1000 > game.endTime)||game.stageRound==='Qualifiers'){ //not a final game
        addEntry(game); //add to qualifiers instead
        return; 
    }

    let currentRound = game.stageRound.toString();
    let atThreeGames = false;

    //Rotates through players that are found on this game. Adds
    //this game to their ID in postQualifiers if they don't already have it.
    let pos = 1;
    for(const gamePlayer of game.players){
        const registrant = findRegistrant(gamePlayer.userId);
        let gameID = gamePlayer.userId;
        let userID = registrant.discordID;
        let games = [];
        let gameIDs = [];
        let scores = [];
        let points = [];
        let positions = [];
        let stageobject = {};
        let tableID = game.paiPuId;
        
        if(PostQPlayers.hasOwnProperty(userID)){
            games = PostQPlayers[userID].games;
            gameIDs = PostQPlayers[userID].gameIDs;
            stageobject = PostQPlayers[userID].stage

            //if this player already has this stage, grab that info too.
            if(PostQPlayers[userID].stage.hasOwnProperty(currentRound))
            {
                scores = stageobject[currentRound].scores;
                points = stageobject[currentRound].points;
                positions = stageobject[currentRound].positions;
                tableID = stageobject[currentRound].tableID;
            }

            //if this player already has this match recorded, skip adding it to the record
            if(gameIDs.includes(game.paiPuId)){
                pos++;
                continue;
            }
        }
        games.push(game);
        gameIDs.push(game.paiPuId);
 
        scores.push(score.calculateScore(gamePlayer.points,pos));
        points.push(gamePlayer.points);
        positions.push(pos);

        stageobject[`${currentRound}`] = {
            stageName: currentRound,
            tableID: tableID,
            scores: scores,
            points: points,
            positions: positions,
            gameEndTime: game.endTime,
            RCID: gameID,
            gameName: registrant.gameName,
            discordID: userID,
            discordName: registrant.discordName
        }

        if (positions.length >=3)
        {
            atThreeGames=true;
        }

        PostQPlayers[userID] = {
            discordID: userID,
            discordName: registrant.discordName,
            RCID: gameID,
            gameName: registrant.gameName,
            gameIDs: gameIDs,
            games: games,
            gameEndTime: game.endTime,
            inserver: registrant.inserver,
            stageRound: currentRound,
            stage: stageobject,
            //The field to denote if the player was knocked out or not. False means knocked out.
            isAlive: true
        }

        //add functions to those objects
        Object.assign(PostQPlayers[userID].stage[`${currentRound}`],funcs.scoreConsec);
        Object.assign(PostQPlayers[userID].stage[`${currentRound}`],funcs.scoreConsecForce);
        Object.assign(PostQPlayers[userID].stage[`${currentRound}`],funcs.scoreLast);
        pos++;
    }

    let postQValids = rankingInRound(currentRound);
   // console.log('yo');
    //console.log(postQValids);
   // console.log('hi');

}


//get the header message before the qualifiers start
function getPrequalifierHeader(valids){
    //Produces the timestamp for discord to read. It is a unix timestamp
    let timestamp = new Date(config.startDate.year,config.startDate.month,config.startDate.day,
        config.startDate.hour,config.startDate.minutes,config.startDate.seconds).getTime()/1000
    let stageStatus = `Qualifiers begins <t:${timestamp}:R> (<t:${timestamp}:F>)`;
    let games = rcBot.getGames();
    let embed = new Discord.EmbedBuilder()
        .setTitle('Whale Cup 2023')
        .setDescription('Welcome to the second Whale Cup Tournament!\nThis channel and announcements is where you will find all important tournament information.')
        .addFields(
            {
                name: 'Current Stage',
                value: stageStatus
            },{
                name: 'Stats',
                value:
                `*Registrated players:* **${Object.entries(registrants).length}**
                 *Participating players:* **${valids.length}** *(played ${config.bestof} or more games)*
                 *Contributing players:* **${Object.entries(players).length}** *(played at least 1 game)*
                 *Games played:* ** ${games.length}**`
            }
        )
        .setTimestamp()
    return embed;
}
//get the header message before the finals start
function getPrefinalHeader(valids){
    let timestamp = new Date(config.postQualifiersDate.year,config.postQualifiersDate.month,config.postQualifiersDate.day,
        config.postQualifiersDate.hour,config.postQualifiersDate.minutes,config.postQualifiersDate.seconds).getTime()/1000
    let stageStatus = `Qualifiers - Ended\nKnockout stage begins <t:${timestamp}:R> (<t:${timestamp}:F>)`;
    let games = rcBot.getGames();
    let embed = new Discord.EmbedBuilder()
        .setTitle('Whale Cup 2023')
        .setDescription('Welcome to the second Whale Cup Tournament!\nThis channel and announcements is where you will find all important tournament information.')
        .addFields(
            {
                name: 'Current Stage',
                value: stageStatus
            },{
                name: 'Stats',
                value:
                `*Registrated players:* **${Object.entries(registrants).length}**
                 *Participating players:* **${valids.length}** *(played ${config.bestof} or more games)*
                 *Contributing players:* **${Object.entries(players).length}** *(played at least 1 game)*
                 *Games played:* ** ${games.length}**`
            }
        )
        .setTimestamp()
    return embed;
}
//get the header message during the finals
function getPostQualifiersHeader(valids){
    let stageStatus = `Knockout - Ongoing`;
    let games = rcBot.getGames();
    let amountOfAlive=0;
    let embed = new Discord.EmbedBuilder()
        .setTitle('Whale Cup 2023')
        .setDescription('Welcome to the second Whale Cup Tournament!\nThis channel and announcements is where you will find all important tournament information.')
        .addFields(
            {
                name: 'Current Stage',
                value: stageStatus
            },{
                name: 'Stats',
                value:
                `*Games played:* ** ${games.length}**
                *Registrated players:* **${Object.entries(registrants).length}**
                *Contributing players:* **${Object.entries(players).length}** *(played at least 1 game)*
                *Participating players:* **${valids.length}** *(played ${config.bestof} or more games)*
                *Qualified players:* **${config.amountOfQualifiers}**
                *Players Still in the Running:* *${amountOfAlive}**
                 `
                 //ADD Knocked players, or current alive amount.
            }
        )
        .setTimestamp()
        
    return embed;
}
//get the header message during the qualifiers
function getHeaderEmbed(valids){
    let playersraw = rcBot.getPlayers();
    let games = rcBot.getGames();
    let pls = [[],[],[]];
    //If players exist in playersraw, then we want to sort them into
    //three baskets: 'playing', 'ready' or 'in lobby'
    for(const pl of playersraw){
        if(pl.status == 3) pls[0].push(pl); //playing
        if(pl.status == 2) pls[1].push(pl); //ready
        if(pl.status == 1) pls[2].push(pl); //in lobby
    }

    //Produces the timestamp for discord to read. It is a unix timestamp
    let timestamp = new Date(config.endDate.year,config.endDate.month,config.endDate.day,
        config.endDate.hour,config.endDate.minutes,config.endDate.seconds).getTime()/1000
    
    let embed = new Discord.EmbedBuilder()
        .setTitle('Whale Cup 2023')
        .setDescription('Welcome to the second Whale Cup Tournament!\nThis channel and announcements is where you will find all important tournament information.')
        .setColor(0xFF984D)
        .addFields(
            {
                name: 'Current Stage',
                value: `Qualifiers - Ends <t:${timestamp}:R> (<t:${timestamp}:F>)`
            },{
                name: 'Stats',
                value:
                `*Registrated players:* ** ${Object.entries(registrants).length}**
                 *Participating players:* ** ${valids.length}** *(played ${config.bestof} or more games)*
                 *Contributing players:* **${Object.entries(players).length}** *(played at least 1 game)*
                 *Games played:* ** ${games.length}**`
            },{
                name: 'Active players',
                value: 
                `🔴 ${pls[0].length} - In-game
                 🟡 ${pls[2].length} - In lobby
                 🟢 ${pls[1].length} - Ready for match`
            }
        )
        .setTimestamp()
    return embed;
}

 
//get the qualifier embed
function getQualifyEmbed(valids){
    let qualified = config.amountOfQualifiers;
    let numbered = '';
    let named = '';
    let points = '';
    let limit = qualified + 150;
    let embedTxt = [];

    if(limit > valids.length) limit = valids.length;

    for(let i = 0; i < limit; i++){
        const pl = valids[i];

        let tmp1 = numbered+`${i + 1}\n`;
        let discordName = `${getNameDiscordEmbed(pl[0].discordID)}`
        if (discordName.length > 30 ) discordName = discordName.substring(0,30)
        let tmp2 = named + `${discordName}\n`;
        let tmp3 = points + `${pl[1]/1000} (${pl[0].games.length})\n`;

        if(tmp1.length > 1023 || tmp2.length > 1023 || tmp3.length > 1023){
            embedTxt.push([numbered,named,points]);
            numbered = '';
            named = '';
            points = '';
        }

        if(i == qualified){
            numbered += `\n`;
            named += `🔼 __**Qualified**__ 🔼\n`;
            points += `\n`;
        }
        numbered += `${i + 1}\n`;
        named += `${discordName}\n`;
        points += `${pl[1]/1000} (${pl[0].games.length})\n`;
    }
    if(numbered == '') numbered = config.invisibleCharacter;
    if(named == '') named = config.invisibleCharacter;
    if(points == '') points = config.invisibleCharacter;
    embedTxt.push([numbered,named,points]);

    let embeds = [];
    for(let i=0; i< embedTxt.length; i++){
        const etxt = embedTxt[i]
        let embed = new Discord.EmbedBuilder()
        .setTitle('Qualified players')
        .setDescription(`${config.invisibleCharacter}`)
        .setColor(0xFF984D) //change this
        .addFields(
            {
                name: 'Position',
                value: `${etxt[0]}`,
                inline: true
            },{
                name: 'User',
                value: `${etxt[1]}`,
                inline: true
            },{
                name: 'Points (games)',
                value: `${etxt[2]}`,
                inline: true
            },
        )
        .setTimestamp();
        embeds.push(embed);
    }

    return embeds;
}


//get status list
function getStatus(rcid,playerstatus){
    const status = ['⚪','🟡','🟢','🔴','⚪'];
    if(playerstatus.hasOwnProperty(rcid)){
        return status[playerstatus[rcid].pl.status];
    }else{
        return status[0];
    }
}

//get the final standings of the tournament
function getPostQualifiersByRound(currentRound){
	let postQValids = rankingInRound(currentRound);
    let names='';
    let points='';
    let tableNum = '';
    let embedTxt = [];
    let tableCurrentNum = 1

    for(let i=0;i < postQValids.length; i++)
    {
        const pl = postQValids[i];
        
        let tmp1 = tableNum+`${Math.trunc((i/4)+1)}`;
        let discordName = `${getNameDiscordEmbed(pl[0].discordID)}`
        if (discordName.length > 30 ) discordName = discordName.substring(0,30)
        let tmp2 = names + `${discordName}\n\n`;
        let tmp3 = points + `${pl[1]/1000} (${pl[0].scores.length})\n\n`;
    	if(tmp1.length > 1023 || tmp2.length > 1023 || tmp3.length > 1023){
            embedTxt.push([tableNum,names,points]);
            tableNum = '';
            names = '';
            points = '';
        }
        if(tableCurrentNum <  Math.trunc((i/4)+1))
        {
            tableCurrentNum = Math.trunc((i/4)+1)
            tableNum += '\n'
            names += '\n'
            points += '\n'
        }
        tableNum += `${Math.trunc((i/4)+1)}\n`
        names += `${discordName}\n`;
	    points += `${pl[0].scores.length} (${pl[1]/1000})\n`;

    }

    if(tableNum == '') tableNum = config.invisibleCharacter;
    if(names == '') names = config.invisibleCharacter;
    if(points == '') points = config.invisibleCharacter;
    embedTxt.push([tableNum,names,points]);

    //build embed
    let embeds = [];
    for(let i = 0; i < embedTxt.length; i++){
        const etxt = embedTxt[i];
        const header = i == 0 ? `Top ${currentRound}` : config.invisibleCharacter;//
        const headerdisc = i == 0 ? '*Sorted by table played on and then summed score on that table.*' : config.invisibleCharacter;
        let embed = new Discord.EmbedBuilder()
        .setTitle(`${header}`)
        .setDescription(`${headerdisc}`)
        .setColor(0xFF984D) //change this
        .addFields(
            {
                name: 'Table Number',
                value: `${etxt[0]}`,
                inline: true
            },{
                name: 'User',
                value: `${etxt[1]}`,
                inline: true
            },{
                name: 'Games (score)',
                value: `${etxt[2]}`,
                inline: true
            },
        )
        .setTimestamp()
        embeds.push(embed);
    }
    
    return embeds;
}


//get embed for unqualified players
function getUnqualifiedEmbeds(){
    //filter out players with less than config.bestof games played
    let embedTxt = [];
    let unqualifieds = [];
    let numbered = '';
    let named = '';
    let points = '';
    //get non qualified players

    for(const [key,value] of Object.entries(players)){
        if(value.games.length < config.bestof){
            let score = value.scoreConsecForce();
            unqualifieds.push([value,score[0],value.games.length]);
        }
    }
    //sort mainly by amount of games, then by score
    unqualifieds.sort((a,b) =>{ 
        if(a[2] == b[2]){
            if(a[1] == b[1]){
                return 0;
            }else{
                return (a[1] > b[1]) ? -1 : 1;
            }
		}else{
			return (a[2] > b[2]) ? -1 : 1;
		}
    });
    //build text
    for(let i = 0; i < unqualifieds.length; i++){
        const pl = unqualifieds[i];
        let tmp1 = numbered + `${i + 1}\n`;
        //console.log(pl)

        let discordName = `${getNameDiscordEmbed(pl[0].discordID)}`
        if(discordName.length > 30 ) discordName = discordName.substring(0,30)
        let tmp2 = named + `${discordName}\n`;
        let tmp3 = points + `${pl[1]/1000} (${pl[0].games.length})\n`;
        if(tmp1.length > 1023 || tmp2.length > 1023 || tmp3.length > 1023){
            embedTxt.push([numbered,named,points]);
            numbered = '';
            named = '';
            points = '';
        }
        numbered += `${i + 1}\n`;
        named += `${discordName}\n`;
        points += `${pl[0].games.length} (${pl[1]/1000})\n`;
    }
    //if text is empty set an invisible symbol to avoid discord errors
    if(numbered == '') numbered = config.invisibleCharacter;
    if(named == '') named = config.invisibleCharacter;
    if(points == '') points = config.invisibleCharacter;
    embedTxt.push([numbered,named,points]);
    //build embed
    let embeds = [];
    for(let i = 0; i < embedTxt.length; i++){
        const etxt = embedTxt[i];
        const header = i == 0 ? 'Players without enough games' : config.invisibleCharacter;//
        const headerdisc = i == 0 ? '*sorted by games played, and score achieved*' : config.invisibleCharacter;
        let embed = new Discord.EmbedBuilder()
        .setTitle(`${header}`)
        .setDescription(`${headerdisc}`)
        .setColor(0xFF984D) //change this
        .addFields(
            {
                name: 'Position',
                value: `${etxt[0]}`,
                inline: true
            },{
                name: 'User',
                value: `${etxt[1]}`,
                inline: true
            },{
                name: 'Games (score)',
                value: `${etxt[2]}`,
                inline: true
            },
        )
        .setTimestamp()
        embeds.push(embed);
    }

    return embeds;
}

//get leaderboard embeds
function getLeaderBoardEmbeds(valids){
    let embedTxt = [];
    let numbered = '';
    let named = '';
    let points = '';
    for(let i = 0; i < valids.length; i++){
        const pl = valids[i];
        let tmp1 = numbered + `${i + 1}\n`;
        let tmp2 = named + `${getNameDiscordEmbed(pl[0].discordID)}\n`;
        let tmp3 = points + `${pl[1]/1000} (${pl[0].games.length})\n`;
        if(tmp1.length > 1023 || tmp2.length > 1023 || tmp3.length > 1023){
            embedTxt.push([numbered,named,points]);
            numbered = '';
            named = '';
            points = '';
        }
        numbered += `${i + 1}\n`;
        named += `${getNameDiscordEmbed(pl[0].discordID)}\n`;
        points += `${pl[1]/1000} (${pl[0].games.length})\n`;

    }
    if(numbered == '') numbered = config.invisibleCharacter;
    if(named == '') named = config.invisibleCharacter;
    if(points == '') points = config.invisibleCharacter;
    
    embedTxt.push([numbered,named,points]);

    let embeds = [];

    for(let i = 0; i < embedTxt.length; i++){
        const etxt = embedTxt[i];
        const header = i == 0 ? 'Leaderboards' : config.invisibleCharacter;
        let embed = new Discord.EmbedBuilder()
        .setTitle(`${header}`)
        .setDescription(`${config.invisibleCharacter}`)
        .setColor(0xFF984D) //change this
        .addFields(
            {
                name: 'Position',
                value: `${etxt[0]}`,
                inline: true
            },{
                name: 'User',
                value: `${etxt[1]}`,
                inline: true
            },{
                name: 'Points (games)',
                value: `${etxt[2]}`,
                inline: true
            },
        )
        .setTimestamp()
        embeds.push(embed);
    }

    return embeds;
}

//get finalist standings
function getFinalistsTotalStandings(){
    let standings = [];
    let semiStandings = {};
    let finalStandings = {};
    for(const [key, table] of Object.entries(finalists)){
        let tableScores = table.getStandings();
        for(const playerScore of tableScores){
            if(parseInt(playerScore[0]) < 0) continue;
            if(table.stage == 0){
                semiStandings[playerScore[0]] = {
                    discordID: playerScore[0],
                    score: playerScore[1],
                    qualiScore: playerScore[2],
                }
            }else{
                finalStandings[playerScore[0]] = {
                    discordID: playerScore[0],
                    score: playerScore[1],
                    qualiScore: semiStandings[playerScore[0]].score,
                }
                delete semiStandings[playerScore[0]];
            }
        }
    }
    let semiStandingsArray = [];
    let finalStandingsArray = [];
    for(const [key, player] of Object.entries(finalStandings)) semiStandingsArray.push([key, player.score, player.qualiScore]);
    for(const [key, player] of Object.entries(semiStandings)) finalStandingsArray.push([key, player.score, player.qualiScore]);
    semiStandingsArray.sort((a,b) => {
        if(a[1] == b[1]){
            if(a[2] == b[2]) return 0;
            return a[2] > b[2] ? -1 : 1;
        }
        return a[1] > b[1] ? -1 : 1;
    });
    finalStandingsArray.sort((a,b) => {
        if(a[1] == b[1]){
            if(a[2] == b[2]) return 0;
            return a[2] > b[2] ? -1 : 1;
        }
        return a[1] > b[1] ? -1 : 1;
    });
    for(const entry of semiStandingsArray) standings.push(entry);
    for(const entry of finalStandingsArray) standings.push(entry);
    for(const i in standings) standings[i].push(i);
    return standings;
}

//function ranking of players in round provided
function rankingInRound(currentRound)
{
    let foundPlayers = [];
    //Filters games to just include games of this round.
    //Examples: 64A, 64B... 8,4
    for(const [key,value] of Object.entries(PostQPlayers))
    {
        //The actual filter
        if(value.stage.hasOwnProperty(currentRound))
        {
            let res = value.stage[currentRound].scoreConsecForce()[0];
            
            foundPlayers.push([value.stage[currentRound],res]);            
        }
    }
    //Sort by TableID and then summed Score.
    foundPlayers.sort((a,b) =>{
        if(a[0].tableID == b[0].tableID){
            if(a[0].scoreConsecForce()[0] == b[0].scoreConsecForce()[0]) return 0
            return (a[0].scoreConsecForce()[0] > b[0].scoreConsecForce()[0]) ? -1 : 1;
        }else{
            return (a[0].tableID > b[0].tableID) ? -1 : 1;
        }
    });
    return foundPlayers;
}


//get a sorted ranking of the players
function rankingPlayers(){
    let list = [];
    for(const [key,value] of Object.entries(players)){
        let res = value.scoreConsec();

        if(value.gameName != 'Kujira')
            if(res[1] != -1) list.push([value,res[0]]);
    }
    list.sort((a,b) =>{
        if(a[1] == b[1]){
			return 0;
		}else{
			return (a[1] > b[1]) ? -1 : 1;
		}
    });
    return list;
}

//find a registrant by game played
function findRegistrant(search){
    for(const [key,value] of Object.entries(registrants)){
        if(value.gameID == search) return value;
    }
    return -1;
}
//update stat messages
async function updateMessages(content){
    let i = 0;
    let totallength = 0;
    let currentEmbeds = []; //{content: config.invisibleCharacter,embeds:leaderBoardEmbeds},
    //Goes through all messages built
    for(const data of content){
        //Goes through all the embeds found in a message. It will add
        for(let x of data.embeds)
        {
            totallength += lengthEmbed(x);
            
            if(totallength>6000 || currentEmbeds.length >=10)
            {
                await updateMessage(i,{content: config.invisibleCharacter,embeds:currentEmbeds});
                currentEmbeds = [];
                i++;
                totallength = lengthEmbed(x);
            }
            
            currentEmbeds.push(x);
        }
    }
    await updateMessage(i,{content: config.invisibleCharacter,embeds:currentEmbeds});
}

//Returns the full character length of an embed.
function lengthEmbed(embed){
    let sum = 0;

    if(embed.data.hasOwnProperty('title')) sum += embed.data.title.length;
    if(embed.data.hasOwnProperty('description')) sum += embed.data.description.length;
    if(embed.data.hasOwnProperty('fields')){
        for(let field of embed.data.fields){
            sum += field.name.length;
            sum += field.value.length;
        }
    }
    return sum;
}


//update a single leaderboard message with target payload
//REMEMBER to fill in standingMessages or else it will return 
//message.edit is not a function.
function updateMessage(messageIndex,payload){
    return new Promise(async (resolve,reject) =>{
        const message = await standingsChannel.
        messages.fetch(standingMessages[messageIndex]).
        catch(err => reject(err));
		
        await message.edit(payload).catch(err => reject(err));
        resolve();
    });
}
//update standings according to current stage and with given new games
function updateStandings(type,newGames = []){
    console.log(type);
    return new Promise(async (resolve,reject) =>{
        switch(type){
            case 0: //prequalifiers
                updatePrequalifiers();
                break;
            case 1: //qualifiers
                updateQualifiers(newGames);
                break;
            case 2: //prefinals
                updatePrefinals(newGames);
                break;
            case 3: //postQualifiers
                updatePostQualifiers(newGames);
                break;
            default://undefined
                break;
        }
        resolve();
    });
}
//update leaderboard before qualifiers
async function updatePrequalifiers(){
    let valids = rankingPlayers();
    checkMembersInServer();
    let headerEmbed = getPrequalifierHeader(valids);
    let qualifyEmbed = getQualifyEmbed(valids);
    let leaderBoardEmbeds = getLeaderBoardEmbeds(valids);
    let unqualifiedEmbeds = getUnqualifiedEmbeds(valids);

    let content = [
        {content: config.invisibleCharacter,embeds:[headerEmbed]},
        {content: config.invisibleCharacter,embeds:qualifyEmbed},
        {content: config.invisibleCharacter,embeds:leaderBoardEmbeds},
        {content: config.invisibleCharacter,embeds:unqualifiedEmbeds},
    ]
    updateMessages(content);
}
//update leaderboard during qualifiers
async function updateQualifiers(newGames){
    return new Promise(async (resolve,reject) =>{
        checkMembersInServer();
        if(newGames.length == 0){    //no new games, this means the other embeds will be untouched, we only need to update the header
            let valids = rankingPlayers();
            let header = getHeaderEmbed(valids);
            let msg = await fetchHeaderMessage();
            let embeds = msg.embeds;
            embeds[0] = header;
            let payload_u = {content: config.invisibleCharacter,embeds:embeds};
            await updateMessage(0,payload_u);
            resolve();
        }else{
            //update Object
            console.log('new matches');
            updateObject(newGames);
            let valids = rankingPlayers();
            let headerEmbed = getHeaderEmbed(valids);
            let qualifyEmbed = getQualifyEmbed(valids);
            let unqualifiedEmbeds = getUnqualifiedEmbeds(valids);
            let content = [
                {content: config.invisibleCharacter,embeds:[headerEmbed]},
                {content: config.invisibleCharacter,embeds:qualifyEmbed},
                {content: config.invisibleCharacter,embeds:unqualifiedEmbeds},
            ]
            updateMessages(content);
        }
    });
}
//update leaderboard before finals
async function updatePrefinals(newGames){
    //checkMembersInServer();
    if(newGames.length > 0) console.log('new matches');
    updateObject(newGames);
    let valids = rankingPlayers();  //update valid list!

    let headerEmbed = getPrefinalHeader(valids);
    //let bracketEmbeds = getBracketEmbeds();
    let unqualifiedEmbeds = getUnqualifiedEmbeds(valids);
    let qualifyEmbed = getQualifyEmbed(valids);

    if(!finalmessageposted){
        console.log('ended');
        let msg = buildFinalMessage();
        //const announce = await client.channels.fetch(config.logChannel).catch(err => reject(err));
        //announce.send(msg);
        finalmessageposted = true;
    }
    let content = [
        {content: config.invisibleCharacter,embeds:[headerEmbed]},
        {content: config.invisibleCharacter,embeds:qualifyEmbed},
        {content: config.invisibleCharacter,embeds:unqualifiedEmbeds},
    ]
    updateMessages(content);
}
//update leaderboard during finals
async function updatePostQualifiers(newGames){
    if(newGames.length > 0) console.log('new matches');
    let valids = rankingPlayers();


    updateObjectPostQualifiers(newGames,false);
    let headerEmbed = [getPostQualifiersHeader(valids)];
    let content = [
        {content: config.invisibleCharacter,embeds:headerEmbed}
    ]
    //Add as many rounds as you have here, as you can see this is 4 rounds 32->4.

    let postQualifiers32Embed = getPostQualifiersByRound('32');
    content.push({content: config.invisibleCharacter,embeds:postQualifiers32Embed});   

    let postQualifiers16Embed = getPostQualifiersByRound('16');    
    content.push({content: config.invisibleCharacter,embeds:postQualifiers16Embed});     

    let postQualifiers8Embed = getPostQualifiersByRound('8');
    content.push({content: config.invisibleCharacter,embeds:postQualifiers8Embed});

    let postQualifiers4Embed = getPostQualifiersByRound('4');
    content.push({content: config.invisibleCharacter,embeds:postQualifiers4Embed});  

    updateMessages(content);
}

//announce game start
async function announceGameStart(id){
    //to be sure, treat id as a string, even though it shoud be an integer.
    let announceMessage = ``;l
    const table = finalists[`${id}`];
    switch(table.stage){
        case 0:
            announceMessage += `**Table ${parseInt(table.table) + 1}**`;
            break;
        case 1:
            announceMessage += `**Finals**`;
            break;
        default:
            throw new Error(`unknown stage in table ${id}!\tstage - ${table.stage}\t-\tAnnounce game start`);
    }
    announceMessage += ` ${table.games.length + 1}/${config.finalSettings.match_counts[table.stage]} started!`;
    announceChannel.send(announceMessage);
}
//this was disabled because it glitched out
async function announceGameEnd(id){
    //to be sure, treat id as a string, even though it should be an integer.
    let announceMessage = '';
    const table = finalists[`${id}`];
    switch(table.stage){
        case 0:
            announceMessage += `**Final table** Hanchan ${table.games.length}/${config.finalSettings.match_counts[table.stage]} finished`
            break;
        case 1:
            announceMessage += `**Table ${parseInt(id) + 1}** Hanchan ${table.games.length}/${config.finalSettings.match_counts[table.stage]} finished`
            break;
        default:
            throw new Error(`unknown stage in table ${id}!\tstage - ${table.stage}\t-\tAnnounce game end`);

    }
    if(table.nextGame != -1){
        let pString = '';
        let i = 1;
        for(const player of table.players){
            pString += `<@${player.discordID}>`
            if(i < table.players.length){
                pString += `, `;
            }
            i++;
        }
        announceMessage += `\n${pString}. The next hanchan will start at the latest <t:${Math.floor(table.nextGame)}:R> (<t:${Math.floor(table.nextGame)}:f>) or as soon as all players have readied up!`;
    }
    announceChannel.send(announceMessage);
}
//this will nag players if they don't ready up within the given time
async function announceTardiness(tardylist){
	//penalties are not automated, because it's really hard to do.
	//that needs to be kept track of by tournament admins if it's enforced
    let announceMessage = '';
    let targetPlayers = []
    for(const player of tardylist) targetPlayers.push(findDiscordID(player));

    let pString = '';   //ready players
    let otherPstring = '';  //tardy players
    //build discord tag strings
    for(const player of table.players){
        if(targetPlayers.includes(player.discordID)){
            otherPstring += `<@${player.discordID}>, `;
        }else{
            pString += `<@${player.discordID}>, `;
        }
    }
    announceMessage = `${pString} We are waiting for ${otherPstring} to start the next Hanchan. Point subtraction(s) for those late will apply from <:t${timeForPenalty}:R> (<:t${timeForPenalty}:f>) with -1 point for every minute late.`;
    announceMessage += `\nAfter <:t${timeForPenalty + 600}:R> (<:t${timeForPenalty + 600}:f>) We will ask a substitute to take your place and issue a penalty of -30 points.`;
}

//fetch the header message
function fetchHeaderMessage(){
    return new Promise(async (resolve,reject) =>{
        const message = await standingsChannel.messages.fetch(standingMessages[0]).catch(err => reject(err));
        resolve(message);
    });
}
//get discord name from discord ID
function getNameDiscordEmbed(id){
    if(registrants[id].inserver){
        return `<@${id}>`;
    }else{
        return `${registrants[id].discordName}`;
    }
}
//get discord ID from riichi city friend code
function findDiscordID(riichiCityID){
    let target = -1;
    if(Object.keys(registrants).includes(riichiCityID)) return `${riichiCityID}`; //check if the provided ID is actually a valid discordID
    for(const [key,value] of Object.entries(registrants)){
        if(value.gameID == riichiCityID){
            target = key;
            break;
        }
    }
    return target;
}
//external command for getting the players object
function getPlayers(){
    return players;
}
//external command for getting the finalists object
function getPostQualifiers(){
    return PostQPlayers;
}
//external command for getting the registrants object
function getRegistrants(){
    return registrants;
}
//fetch channels to reduce api calls in the future
function setupChannels(){
    return new Promise(async (resolve,reject) =>{
        logChannel = await client.channels.fetch(config.logChannel).catch(err => reject(err));
        standingsChannel = await client.channels.fetch(config.standingsChannel).catch(err => reject(err));
        announceChannel = await client.channels.fetch(config.announceChannel).catch(err => reject(err));

        await standingsChannel.messages.fetch({ limit: 10 }).then(messages => {
            for(value of messages)
            {
                standingMessages.push(value[0]);
            }
            standingMessages.reverse();
        });

        resolve();
    });
}



//post message in the log channel, can be used for debugging and logging of game events
function logMessage(message){
    return new Promise(async (resolve,reject) =>{
        await logChannel.send(message).catch(err => reject(err));
        resolve();
    });
}
exports.setup = setup;
exports.updateStandings = updateStandings;
exports.getPlayers = getPlayers;
exports.getPostQualifiers = getPostQualifiers;
exports.findDiscordID = findDiscordID;
exports.getRegistrants = getRegistrants;
exports.announceGameStart = announceGameStart;
exports.announceTardiness = announceTardiness;
exports.checkOngoing = checkOngoing;
exports.logMessage = logMessage;