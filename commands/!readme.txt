This folder contains bot commands for the discord portion of the bot.
note that these are only the functions that does the job, you will still need to add the relevant commands into your script.
when you import the script, all you need to do is run the script as a function in response to a player command or action.
	- assign roles.js is an admin locked command that will assign the participant role to all players that are registred in the registrants.txt, participant role is defined in the config
	- matches.js is an admin locked command that will give you a list over a players match history with their scores, position and the game link. you can use this if you suspect cheating.
	- me.js is a common command for users, it will let that player check their own scores for the tournament
	- pause.js is a common command for users, it will let a player pause the game they are currently playing
	- whois.js is a common command for users, it will let a player search for a player and it will tell what their aliases are.
