This folder contains the scripts that make up the bot in its entirety
	-datahandler.js		does most of the read, write and parsing of text documents that make up the cache system
	-discordBot.js		this is the discord integration script, it handles all the commands and the leaderboards
	-functions.js		this script contains object functions to be used in the player and tournament objects
	-googlesheets.js	this script communicates with google's api to display stats in the sheets
	-rcGameLog.js (and V2)	contains script to decode the log format and generate stats. it's not complete yet, but does contain a lot of functions, but some of it is still broken
	-riichicitybot.js	this is the 'master' script, it does all of the heavy lifting and commands the other scripts. it communicates with the riichi city api to start and manage matches and matchmaking
	-score.js	contains a function to calculate the amount of score earned by a player using the tournament settings and placement
	-stats.js	Commands the rcGameLog.js scripts and compiles it to a readable format, this script is not finished and is broken
	-yakus.js	Used by the stat scripts, contains yaku lists in riichi city's format