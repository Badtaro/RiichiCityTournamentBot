* games
	- raw json game records
* scripts
	- script files for bot
* commands
	- command scripts for bot
config.js
	- keys, login data, variables to be changed, etc.
data.json
	- this is the tournament stats that are cached from the discord script, it makes it easier to restart the bot without having to genereate all the tables every time.
domain.json
	- this is the domain file, it's regenerated on every restart, just leave it be.
finalists.txt
	- this is a list over finalists and the table they play on
matches.json
	- tournament game cache
index.js
	- main script file
matches.json
	- a cached list over games that are recorded in the stats. wiping the content of this file would make the bot reload all the games, deleting it would make it crash
<GOOGLE CREDENTIALS>.json
	- doesn't exist yet, but you need to generate it if you wish to use the google sheet integration, check out ./scripts/googlesheets.js for more information about how
stats.txt
	-documentation of the output of the stat script