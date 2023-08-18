const rcbot = require('./riichicitybot.js');

let is_setup = false;
let settings;
function setup() {
    settings = rcbot.getTourneySettings().matchInfo;
	is_setup = true;
}

function calculateScore(points,placement){
	//calculate score given points and placement
	//using tournament settings, therfore running setup is neccesary before issuing this command.
	if(!is_setup) setup();
    let uma = settings.orderPoints[placement-1] * 1000;
    let scoreDiff = points - settings.initialPoints;
    return uma + scoreDiff;
}

exports.setup = setup;
exports.calculateScore = calculateScore;