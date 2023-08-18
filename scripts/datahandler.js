const { table } = require('console');
const fs = require('fs');
const config = require('../config');

//this saves the tournament object
function discordDataSave(data){
	return new Promise(resolve =>{
		data = JSON.stringify(data, null, 2);
		fs.writeFile(`data.json`,data,(err)=>{
			if(err) throw err;
			resolve();
		});
	});
}



//this loads the tournament object
function discordDataLoad(){
	return new Promise(resolve =>{
		fs.readFile(`data.json`,(err,data) => {
			if(err) throw err;
			resolve(data);
		});
	});
}
//this saves the list over games cached, this is important, otherwise you might count a game twice
function rcDataSave(data){
	return new Promise(resolve =>{
		data = JSON.stringify(data, null, 2);
		fs.writeFile(`matches.json`,data,(err)=>{
			if(err) throw err;
			resolve();
		});
	});
}
//this loads the games that are cached
function rcDataLoad(){
	return new Promise(resolve =>{
		fs.readFile(`matches.json`,(err,data) => {
			if(err) throw err;
			resolve(JSON.parse(data));
		});
	});
}
//this returns a list over all gamelogs that are downloaded 
function statLoad(){
	//return a list over games downloaded
	return new Promise((resolve,reject) =>{	
		fs.readdir('./games',(err,files) =>{
			if(err) reject(err);
			resolve(files);
		});
	});
}
//this loads the registration list
function loadContestants(){
	return new Promise(resolve =>{
		fs.readFile(`registrants.txt`,'utf-8',(err,data) => {
			if(err) throw err;
			let contestants = parseContestants(data);
			resolve(contestants);
		});
	});
}
//this parses the registration list and returns an object
function parseContestants(data){
	let contestants = {};
	let contestantEntries = data.split('\n');
	for(let contestant of contestantEntries){
		contestant = contestant.replace('\r','');
		let contestantData = contestant.split('\t');
		contestants[contestantData[0]] = {
			discordID: contestantData[0],
			gameID: parseInt(contestantData[1]),
			discordName: contestantData[2],
			gameName: contestantData[3],
			timeBlock: contestantData[4], //N, A, or B.
			inserver: false //set to true in discordbot.js if they are in the server
		};
	}
	return contestants;
}

//this loads the registration list
function loadPostQMatches(){
	return new Promise(resolve =>{
		fs.readFile(`PostQualifiersMatchMaking.txt`,'utf-8',(err,data) => {
			if(err) throw err;
			let matches = parseMatches(data);
			resolve(matches);
		});
	});
}
//this parses the match list and returns an object. THIS WILL NOT WORK IF THE MATCHES AREN'T GROUPED PROPERLY
function parseMatches(data){
	let matches = {};
	let condensedMatches = {};
	let matchEntriesEntries = data.split('\n');
	let i = 0;
	let x = 0;
	let tablePlayerList = ""; 

	for(let match of matchEntriesEntries){
		match = match.replace('\r','');
		let matchData = match.split('\t');
		
		//triggers on the first run cause empty
		if(tablePlayerList==="")
		{
			//ex: 64A + | + 1234 + | + 2324 + | + 4444 + | + 55555
			tablePlayerList = `${matchData[0]}|${matchData[2]}|${matchData[5]}|${matchData[8]}|${matchData[11]}`; 
		}
		//If the stageround is there and every RCID then it is the same table. Otherwise push to condensed
		//and make a new tablePlayerList.
		if(!tablePlayerList.includes(matchData[0])
		|| !tablePlayerList.includes(matchData[2])
		|| !tablePlayerList.includes(matchData[5])
		|| !tablePlayerList.includes(matchData[8])
		|| !tablePlayerList.includes(matchData[11])
		)
		{
			condensedMatches[x]=matches;
			x++;
			matches = {};
			tablePlayerList = `${matchData[0]}|${matchData[2]}|${matchData[5]}|${matchData[8]}|${matchData[11]}`;
			i=0;
		}


		matches[i] = {
			stageRound: matchData[0],
			tableNumber: matchData[1],
			playerEastRCID: matchData[2],
			playerEastDiscordID: matchData[3],
			PlayerEastGameName: matchData[4],
			playerSouthRCID: matchData[5],
			playerSouthDiscordID: matchData[6],
			PlayerSouthGameName: matchData[7],
			playerWestRCID: matchData[8],
			playerWestDiscordID: matchData[9],
			PlayerWestGameName: matchData[10],
			playerNorthRCID: matchData[11],
			playerNorthDiscordID: matchData[12],
			PlayerNorthGameName: matchData[13]
		};
		i++;
	}
	condensedMatches[x]=matches;
	return condensedMatches;
}

/*
//this loads the PostQPlayers text file
function loadPostQualifiersPlayers(){
	return new Promise(resolve =>{
		fs.readFile(`PostQPlayers.txt`,'utf-8',(err,data) => {
			if(err) throw err;
			let contestants = parsePostQualifiersPlayers(data);
			resolve(contestants);
		});
	});
}
//this parses the PostQPlayers text file
function parsePostQualifiersPlayers(data){
	let PostQPlayers = {};
	let PostQEntries = data.split('\n');
	for(let i = 0; i < PostQEntries.length; i++){
		let table = PostQEntries[i].replace('\r','').split('\t');
		PostQPlayers[(i).toString()] = {
			table: (i).toString(),
			discordIDs: table,
		}
	}
	return PostQPlayers;
}*/

//export and make the functions available for other scripts
exports.discordDataSave = discordDataSave;
exports.discordDataLoad = discordDataLoad;
exports.rcDataSave = rcDataSave;
exports.rcDataLoad = rcDataLoad;
exports.loadContestants = loadContestants;
exports.loadPostQMatches = loadPostQMatches;
exports.statLoad = statLoad;