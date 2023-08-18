const config = {
		//discord authentication token
    pass: 'NUMBERGOHERE', 
	   //this discord bots ID
    myID: 'NUMBERGOHERE',
		//Used for dev commands
    superAdmins: ['NUMBERGOHERE'],
		//Server ID where the bot should operate
    guildID: 'NUMBERGOHERE',  
		//not used in this bot, but could be used for user-locked commands
    volunteerRole: 'NUMBERGOHERE',
		//ID of the role for participants
    participantRole: 'NUMBERGOHERE',
		//ID of the channel where the bot can do announcements
    announceChannel: 'NUMBERGOHERE',
		//ID of the channels where you allow users to use regular commands, admins are always exempt from this
    commandChannels: ['NUMBERGOHERE'],
		//ID of the channel where the bot logs events
    logChannel: 'NUMBERGOHERE',
		//ID of the channel where the bot will display leaderboards
    standingsChannel: 'NUMBERGOHERE',
		//ID of the channel that contains the pause message
    pauseChannel: 'NUMBERGOHERE',
		//ID of the pause message
    pauseMessage: 'NUMBERGOHERE',

            //Remember the following is in this enviroments timezone!
            //you should correct for any timezones
            //might move this to follow riichi city's tournament data

    /*
    You will be unable to record matches unless the startDate has occured and they will recorded as 
    Qualifier matches. 
    */
    startDate: {    //used to set a start time for automated matchmaking in qualifiers
        year: 2023,     //year in YYYY
        month: 7,       //zero indexed MM so 9 -> 10, 0 is January
        day: 10,        //day in DD
        hour: 17,       //Hour in HH
        minutes: 0,     //Minutes in MM
        seconds: 0,     //Seconds in SS
        milliseconds: 0 //Milliseconds in sss
    },
    endDate: {      //used to set a end time for automated matchmaking in qualifiers
        year: 2023,         //year in YYYY
        month: 9,           //zero indexed MM so 9 -> 10, 0 is January
        day: 12,            //day in DD
        hour: 18,           //Hour in HH
        minutes: 00,        //Minutes in MM
        seconds: 00,        //Seconds in SS
        milliseconds: 000   //Milliseconds in sss
    },
    //THESE ARE NOT WHAT WE WILL USE. DON't DELETE YET, BUT REMEMBER THIS AINT  US

    postQualifiersDate: {    //used to separate final games from qualifiers
        year: 2023,         //year in YYYY
        month: 7,           //zero indexed MM so 9 -> 10, 0 is January
        day: 11,            //day in DD
        hour: 9,           //Hour in HH
        minutes: 59,        //Minutes in MM
        seconds: 50,        //Seconds in SS
        milliseconds: 000   //Milliseconds in sss
    },

    BBlockDate: {    //used to separate final games from qualifiers
      year: 2023,         //year in YYYY
      month: 2,           //zero indexed MM so 9 -> 10, 0 is January
      day: 17,            //day in DD
      hour: 18,           //Hour in HH
      minutes: 00,        //Minutes in MM
      seconds: 00,        //Seconds in SS
      milliseconds: 000   //Milliseconds in sss
  },
    //CHANGE THIS
    finalSettings: {    //this is made after we know the amount of steps the final bracket has. in this case we have two steps
        steps: 2,   //amount of stages in elimination stage
        match_counts: [3,5],    //amount of games in elimination stage, per stage. last one is always finals
        gamepause: 300000, //how much time between games in the same stage (this is the upper bound where the bot will start nagging players to ready up)
    },

	//how often should the bot poll updates from riichi city?
	//I reccomend not lowering it below 10 seconds, since discord only allow 5 api requests per 5 seconds
	//you might be bottlenecked by the bot doing about 8 discord api requests per update at worst
	//if you exceed the api limit, you will suffer from it.
    updateInterval: 10000, //in milliseconds
	//how long to wait before another pause/unpause can be issued?
    pauseInterval: 5000,   //in milliseconds
	//how many best of should be used in the tourney? This is for qualifiers
    bestof: 5,
  //how many should advance past qualifiers, make this 0 if you aren't doing any
  //qualifiers. Actually 0 might not work, make it your number of players if no qualifiers
    amountOfQualifiers: 128,
	//amount of players per game
    gamemode: 4,    //gamemode - 4: 4p mahjong, 3: sanma
	//tournament ID to follow, remember the bot account on riichi city needs to be a tournament admin there!
    tournamentID: NUMBERGOHERE,
    
	/* Useful constants */
    invisibleCharacter: '\u200b',
    msDay: 86400000,
    msHour: 3600000
}
module.exports = config;