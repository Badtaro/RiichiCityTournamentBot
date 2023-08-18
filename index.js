const rc = require('./scripts/riichicitybot.js');
const rcstats = require('./scripts/stats.js');

//enable only one of these options
//rcstats.setup()	//stat gatherer
rc.setup();	//tournament bot

process.on('unhandledRejection', err => {
	console.error("Unhandled Rejection", err);
	//const msg = err.stack.replace(new RegExp(`${__dirname}/`, 'g'), './');
	//console.error("Unhandled Rejection", msg);
});
