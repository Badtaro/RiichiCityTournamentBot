const config = require('../config.js');
const score = require('./score.js');

const scoreConsec = {
	//consecutive score for target player assuming they've played enough games
    scoreConsec: function(){
        let highScore = -10000;
        let highIndex = 0;
        if(!this.games.length)return [0,-1];
        if(this.games.length < config.bestof){
            return [0,-1];
        }else if(this.games.length == config.bestof){
            let sum = 0;
            for(let i = 0; i < this.games.length; i++){
                sum += parseInt(this.scores[i]);
            }
            highScore = sum;
            return [highScore,0];
        }else{
            for(let i = 0; i < this.games.length - (config.bestof - 1); i++){
                let sum = parseInt(this.scores[i]);
                for(let j = 1; j < config.bestof; j++){
                    sum += parseInt(this.scores[i + j]);
                }
                if(sum > highScore || i == 0){
                    highScore = sum;
                    highIndex = i;
                }
            }
            return [highScore,highIndex];
        }
    }
}
const scoreConsecForce = {
	//consecutive score for target player even if they didn't play enough games
    scoreConsecForce: function(){
        let sum = 0;
        if(!this.scores.length) return [0,-1];
        if(this.scores.length >= config.bestof) return this.scoreConsec;
        for(let i = 0; i < this.scores.length; i++){
            sum += parseInt(this.scores[i]);
        }
        return [sum,0];
    }
}
const scoreLast = {
	//score for the recent games
    scoreLast: function(){
        if(!this.games.length) return [0,-1];
        if(this.games.length <= config.bestof){
            let sum = 0;
            for(let i = 0; i < this.games.length; i++){
                sum += parseInt(this.scores[i]);
            }
            return sum;
        }else{
            let sum = 0;
            for(let i = 1; i < config.bestof +1; i++){
                sum += parseInt(this.scores[this.scores.length - i]);
            }
            return sum;
        }
    }
}
const sakiScore = {
    /*
    so to calculate how much contribution your score gives we can do
    (your score - lowest score) * multiplier

    like 1st place is 2x participants rounded up to nearest 100 or so
    then 2nd should be 75% of that and 3rd 50%

    */
    score: function(){
        if(!this.active) return -1;
        let score = 0;
        let bonusmax = Math.ceil(this.placementsTot/100)*200; //rounded up to the next doubled 100. 80 participants gives 200 bonus, 210 gives 600
        let bonus = [bonusmax,bonusmax*3/4,bonusmax/2];

        for(const placement of this.placements){
            score += this.placementsTot - placement + 1;
        }
        for(const player of this.finalists){
            if(player[3] < 3){
                score += bonus[player[3]];
            }else{
                score += this.placementsTot - player[3];
            }
        }

        return score;
    }
}
const tableStandings = {
	//this is hideous, but it just works, don't look at me like that, I couldn't find a better way to do it
    getStandings: function(){
        //use the score library to calculate the scores.
        let players = {};
        let gameids = {};
        for(const player of this.players){
            if(player == -1){
                if(players.hasOwnProperty("-1")){  
                    if(players.hasOwnProperty("-2")){
                        if(players.hasOwnProperty("-3")){
                            players["-4"] = {
                                discordID: "-4",
                                gameID: null,
                                score: 0,
                                lastScore: 0,
                            }
                            continue;
                        }else{
                            players["-3"] = {
                                discordID: "-3",
                                gameID: null,
                                score: 0,
                                lastScore: 0,
                            }
                            continue;
                        }
                    }else{
                        players["-2"] = {
                            discordID: "-2",
                            gameID: null,
                            score: 0,
                            lastScore: 0,
                        }
                        continue;
                    }
                }else{
                    players["-1"] = {
                        discordID: "-1",
                        gameID: null,
                        score: 0,
                        lastScore: 0,
                    }
                    continue;
                }
            }else{
                players[player.discordID] = {
                    discordID: player.discordID,
                    gameID: player.RCID,
                    score: 0,
                    lastScore: player.scoreConsec()[0],
                }
            }
            //make quick lookup table
            gameids[player.RCID] = player.discordID;
        }
        if(!this.games.length){ //no games played, return default standing
            //we need to return an array with playerids and scores of 0 and that player's qualifier cumulative score
            let returnArray = [];
            for(const [key,player] of Object.entries(players)){
                returnArray.push([key, player.score, player.lastScore]);
            }
            returnArray.sort((a,b) =>{
                if(a[1] == b[1]){
                    if(a[2] == b[2]) return 0;
                    return a[2] > b[2] ? -1 : 1; 
                }
                return a[1] > b[1] ? -1 : 1;
            });
            return returnArray;
        }
        //generate scores
        for(const game of this.games){
            for(const playerpos in game.players){   //using "in" instead of "of", this will give us the index numbers instead of the entry itself
                const player = game.players[playerpos];
                const discordID = gameids[player.userId];
                const scoreearned = score.calculateScore(player.points,parseInt(playerpos)+1);
                players[discordID].score += scoreearned;
            }
        }
        //push scores into an array that can actually be used for something
        let tableStandings = [];
        for(const [key,player] of Object.entries(players)){
            tableStandings.push([key,player.score,player.lastScore]);
        }

        //sort array by scores
        tableStandings.sort((a,b) =>{
            if(a[1] == b[1]){
                if(a[2] == b[2]) return 0;
                return a[2] > b[2] ? -1 : 1;    //if a[2] is greater move entry up, if not then move it down
            }
            return a[1] > b[1] ? -1 : 1;    //if a[1] is greater move entry up, if not then move it down
        });
        return tableStandings;
    }
}

exports.scoreConsec = scoreConsec;
exports.scoreLast = scoreLast;
exports.scoreConsecForce = scoreConsecForce;
exports.sakiScore = sakiScore;
exports.tableStandings = tableStandings;