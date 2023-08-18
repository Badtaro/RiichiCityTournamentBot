/*******************************************************************************************************

	THIS SCRIPT IS TERRIBLE, USE V2 INSTEAD, KEEPING THIS BECAUSE IT MIGHT BE USEFUL LATER

********************************************************************************************************/


const fs = require('fs');
const requests = require('../requests/requests.js');
const { calculateScore } = require('./score.js');
const yakus = require('./yakus.js')

const suits_short = ['p','s','m'];
const suits_long = ['pin','sou','man'];
const honours = ['East', 'South', 'West', 'North', 'Haku', 'Hatsu', 'Chun'];
const yaku_language = 'English_weeb'; // also have English and Japanese
const sakiAward = yakus[yaku_language][3];
const tokiAward = [yakus[yaku_language][0],yakus[yaku_language][1],yakus[yaku_language][2]];
const kuroAward = [yakus[yaku_language][49],yakus[yaku_language][50],yakus[yaku_language][51],yakus[yaku_language][55]];
let yakuman = {};
let inta = 0;
let limita = 3;


function loadGame(path){
    return new Promise((resolve, reject) =>{
        fs.readFile(path,(err,data)=>{
            if (err) throw err;
            const gamelog = JSON.parse(data);
            resolve(gamelog);
        });
    });
}
async function downloadGame(log, force = false){
    //downloads a log if it doesn't exist and returns it. can be forced to redownload
    return new Promise(async (resolve,reject) => {
        if(fs.existsSync(`./games/${log}.json`) && !force){
            const returnlog = await loadGame(`./games/${log}.json`);
            resolve(returnlog);
        }else{
            if(!requests.logged_in) await requests.login();
            const returnlog = await requests.fetchLog(log);
            const data = JSON.stringify(returnlog, null, 2);
            fs.writeFile(`./games/${log}.json`,data,async (err) =>{
                if(err) throw err;
                resolve(returnlog);
            });
        }
    });
}
function parse(gamelog,Players){
    //console.log(gamelog.keyValue);
    let Rounds = [];
    let gameEnd = {
        scores: {},
        time: 0,
    };
    const mode = gamelog.playerCount;
    for(const player of gamelog.handRecord[0].players){
        if(!Players.hasOwnProperty(player.userId)){
            Players[player.userId] = {
                uid: player.userId,
                uname: player.nickname,
                yakitori: 0,
                dealerships: 0,
                won_this: false,
                on_streak: false,    //if this player won the previous round
                won_this_streak: 0,
                riichis: 0,
                hands_won: 0,
                tsumos: 0,
                tenpais: 0,
                furitens: 0,
                no_yakus: 0,
                atozukes: 0,
                doras_this_round: 0,
                teru: 0,
                toki: 0,
                saki: 0,
                kuro: 0,
                riichi_turns: [],
                winning_tiles: [],
                score_progression: [],
                rounds: [],
            }
        }else{
            Players[player.userId].on_streak = false;
            Players[player.userId].won_this_streak = false;
            Players[player.userId].doras_this_round = 0;
        }
    }
    //console.log(Players);
    let roundNum = 0;
    for(const round of gamelog.handRecord){
        let roundText = calcRoundName(round.benChangNum,round.changCi,round.quanFeng,mode);
        //console.log(roundText);
        let roundPlayers = {};
        let dice = [];
        let dora = [];
        let uradora = [];
        let riichi_sticks = 0;
        let honba = 0;
        let winner = null;
        let lastStamp = 0;
        let lastcallable = 0;
        for(const [key, player] of Object.entries(round.players)){
            roundPlayers[player.userId] = {
                uid: player.userId,
                uname: player.nickname,
                game: gamelog.keyValue,
                round: roundText,
                roundNum: roundNum,
                yakitori: null,
                is_dealer: 0,
                in_riichi: 0,
                riichi_declared: null,
                on_streak: Players[player.userId].on_streak,
                toki: 0,
                saki: 0,
                dora: 0,
                win: 0,
                tsumo: 0,
                wintile: null,
                tenpai: 0,
                tenpaiturn: null,
                furiten: 0,
                noyaku: 0,
                atozuke: 0,
                start_score: 0,
                tenpai_at_draw: false,
                startingHand: [],
                finalHand:[],
                draws: [],
                discards: [],
                actiontime: [],
                actions: [],
                all_waits: [],
                final_waits: [],
                timebuffer: [],
                kita: 0,
                kitadraws: [],
                //chii, pon, closed kan, added kan, open kan
                calls: [[],[],[],[],[]],
                possiblecalls: [0,0,0,0],
                couldcalltiles:[],
                waitbuffer: [], //used to cache tenpai info. use this to decide waits and whether or not that player is furiten.
            }
        }
        for(const event of round.handEventRecord){
            let parsed = JSON.parse(event.data);
            if(lastStamp == 0) lastStamp = event.startTime;
            if(event.userId != 0){
                //console.log(event.userId);
                //console.log(roundPlayers);
                roundPlayers[event.userId].actiontime.push(event.startTime - lastStamp);
                roundPlayers[event.userId].actions.push(event.eventType);
            }
            lastStamp = event.startTime;
            //console.log(event.eventPos);
            let yaku;
            let prize;
            switch(event.eventType){
                case 1: //starting hands
                    dice = parsed.dices;
                    dora = translateTile(event.bao_pai_card,1); //needs to change if suddenly for some reason we start with more than one indicator flipped
                    riichi_sticks = event.li_zhi_bang_num;
                    honba = event.ben_chang_num;
                    
                    if(parsed.hand_cards.length == 14){
                        roundPlayers[event.userId].is_dealer = true;
                    }
                    for(const tile of parsed.hand_cards){
                        roundPlayers[event.userId].startingHand.push(translateTile(tile,1));
                    }
                    for(const player of parsed.user_info_list){
                        roundPlayers[player.user_id].start_score = player.hand_points;
                        roundPlayers[player.user_id].yakitori = player.is_exist_shao_ji;
                    }
                    break;
                case 2: //draw
                /*
                    console.log('');
                    console.log(event);
                    console.log(parsed);
                    */
                    if(parsed.in_ting_info.length){
                        if(parsed.in_ting_info[0].hasOwnProperty('ting_list')){
                            roundPlayers[event.userId].waitbuffer = parsed.in_ting_info;
                            for(const obj of parsed.in_ting_info){
                                //console.log(obj.discard_card);
                                //console.log(obj.ting_list);
                            }
                        }
                    }
                    //console.log('');
                    roundPlayers[event.userId].timebuffer.push(parsed.oper_var_time);
                    let cardDrawn = parsed.in_card
                    if(parsed.in_card == 0) cardDrawn = lastcallable;
                    if(parsed.in_card == 0 && lastcallable == 0) break;
                    roundPlayers[event.userId].draws.push(translateTile(cardDrawn,1));
                    if(parsed.is_gang_incard){
                        roundPlayers[event.userId].kitadraws.push(translateTile(cardDrawn,1));
                    }
                    break;
                case 3: //timer freeze, triggers when a player can make a call and it's not their turn.
                    lastcallable = parsed.out_card;
                    for(const action of parsed.action_list){
                        switch(action){
                            case 2: //chi left x23s
                            case 3: //chi middle 2x4
                            case 4: //chi right 23x
                                roundPlayers[event.userId].possiblecalls[0]++;
                                break;
                            case 5: //pon
                                roundPlayers[event.userId].possiblecalls[1]++;
                                break;
                            case 6: //kan
                                roundPlayers[event.userId].possiblecalls[2]++;
                                break;
                            case 7: //ron
                                roundPlayers[event.userId].possiblecalls[3]++;
                                break;
                            default:
                                throw new Error(`unhandled action: ${action}`);
                        }
                    }
                    roundPlayers[event.userId].couldcalltiles.push(translateTile(parsed.out_card,1));
                    roundPlayers[event.userId].timebuffer.push(parsed.oper_var_time);
                    break;
                case 4: //discards or calls
                    switch(parsed.action){
                        case 2: //chi left x23s
                        case 3: //chi middle 2x4
                        case 4: //chi right 23x
                            roundPlayers[event.userId].calls[0].push(translateTile(parsed.card,1));
                            break;
                        case 5: //pon
                            roundPlayers[event.userId].calls[1].push(translateTile(parsed.card,1));
                            break;
                        case 6: //Open kan
                            roundPlayers[event.userId].calls[4].push(translateTile(parsed.card,1));
                            break;
                        case 7: //ron
                            roundPlayers[event.userId].win = 1;
                            roundPlayers[event.userId].wintile = translateTile(parsed.card,1);
                            roundPlayers[event.userId].finalHand = parsed.hand_cards;
                            if(winner != null){
                                winner = [winner, event.userId];
                            }else{
                                winner = event.userId;
                            }
                            break;
                        case 8: //closed Kan
                            roundPlayers[event.userId].calls[2].push(translateTile(parsed.card,1));
                            break;
                        case 9: //added kan
                            roundPlayers[event.userId].calls[3].push(translateTile(parsed.card,1));
                            break;
                        case 10: //tsumo
                            roundPlayers[event.userId].win = 1;
                            roundPlayers[event.userId].tsumo = 1;
                            roundPlayers[event.userId].wintile = translateTile(parsed.card,1);
                            roundPlayers[event.userId].finalHand = parsed.hand_cards;
                            winner = event.userId;
                            break;
                        case 11: //discard
                            if(roundPlayers[event.userId].waitbuffer.length && !roundPlayers[event.userId].in_riichi){
                                let tenpai = false;
                                for(const waits of roundPlayers[event.userId].waitbuffer){
                                    if(waits.discard_card == parsed.card){
                                        //discarded a tenpai tile, this means this player is now in tenpai
                                        //tenpai data is stored in the waitbuffer, it's the same object the game gave us when they draw a tile that puts them in tenpai
                                        tenpai = true;
                                        let wait_tiles = [];
                                        let furiten = 0;
                                        let hasyaku = 0;
                                        roundPlayers[event.userId].tenpai = 1;

                                        for(const waittile of waits.ting_list){
                                            let tile = translateTile(waittile.ting_card,1);
                                            furiten += waittile.is_zhen_ting ? 1 : 0;   //zhen ting means furiten
                                            hasyaku += waittile.is_wu_yi ? 0 : 1;          //wu yi means no yaku, therefore if it's false you have yaku
                                            wait_tiles.push(tile);
                                            //add tile to all waits if it isn't already there
                                            if(roundPlayers[event.userId].all_waits.indexOf(tile) == -1) roundPlayers[event.userId].all_waits.push(tile);
                                        }
                                        //update final waits
                                        roundPlayers[event.userId].noyaku = (hasyaku == 0 && !parsed.is_li_zhi) ? 1 : 0; //check for riichi before setting no yaku flag
                                        roundPlayers[event.userId].atozuke = (hasyaku < waits.ting_list.length && !parsed.is_li_zhi) ? 1 : 0; //check for riichi before setting atozuke flag
                                        roundPlayers[event.userId].furiten = furiten > 0 ? 1 : 0;
                                        roundPlayers[event.userId].final_waits = wait_tiles;
                                    }
                                }
                                if(!tenpai){
                                    roundPlayers[event.userId].noyaku = 0;
                                    roundPlayers[event.userId].atozuke = 0;
                                    roundPlayers[event.userId].furiten = 0;
                                    roundPlayers[event.userId].final_waits = [];
                                }
                            }
                            if(parsed.is_li_zhi){
                                roundPlayers[event.userId].tenpai = 1;
                                roundPlayers[event.userId].in_riichi = 1;
                                roundPlayers[event.userId].riichi_declared = roundPlayers[event.userId].discards.length;
                            }
                            roundPlayers[event.userId].discards.push(translateTile(parsed.card,1));
                            break;
                        case 13: //kita
                            roundPlayers[event.userId].kita++;
                            break;
                        default:
                            throw new Error(`unhandled action: ${parsed.action}`);
                    }
                    /*
                    console.log('');
                    console.log(event);
                    console.log(parsed);
                    console.log('');
                    */
                    break;
                case 5: //round end info
                /*
                console.log('');
                console.log(event);
                console.log(parsed);
                console.log(parsed.end_type);
                console.log(parsed.win_info[0].fang_info);
                console.log(parsed.win_info[0].user_cards);
                console.log(parsed.win_info[0].li_bao_card);
                console.log('');
                */
                    switch(parsed.end_type){
                        case 0:     //Ron
                            /*
                            console.log('');
                            console.log(event);
                            console.log(parsed);
                            console.log(parsed.end_type);
                            console.log(parsed.win_info[0].fang_info);
                            console.log(parsed.win_info[0].user_cards);
                            console.log(parsed.win_info[0].li_bao_card);
                            console.log('');
                            */
                            for(const winner of parsed.win_info){
                                yaku = parseYakus(winner.fang_info);
                                prize = getPrize(yaku);
                                roundPlayers[winner.user_id].win = 1;
                                roundPlayers[winner.user_id].saki = prize[0];
                                roundPlayers[winner.user_id].toki = prize[1];
                                roundPlayers[winner.user_id].dora = prize[2];
                                if(yaku[2]){
                                    compileYakuman(yaku,gamelog.keyValue,roundText);
                                }
                            }
                            if(parsed.win_info.length > 1 && false){
                                console.log(parsed);
                                for(const entry of parsed.win_info){
                                    console.log(entry.fang_info);
                                }
                                throw new Error(`multiple winners`);
                            }
                            break;
                        case 1:     //Tsumo
                            
                            for(const winner of parsed.win_info){
                                yaku = parseYakus(winner.fang_info);
                                prize = getPrize(yaku);
                                roundPlayers[winner.user_id].win = 1;
                                roundPlayers[winner.user_id].saki = prize[0];
                                roundPlayers[winner.user_id].toki = prize[1];
                                roundPlayers[winner.user_id].dora = prize[2];
                                if(yaku[2]){
                                    compileYakuman(yaku,gamelog.keyValue,roundText);
                                }
                            }
                            break;
                        case 7:    //Ryuukoku / exhaustive draw
                            for(const winner of parsed.win_info){
                                roundPlayers[winner.user_id].tenpai_at_draw = true;
                            }
                            break;
                        default:
                            console.log('');
                            console.log(event);
                            console.log(parsed);
                            console.log('');
                            throw new Error(`unhandled end type: ${parsed.end_type}`);
                    }
                    break;
                case 6: //game end info
                    for(const user of parsed.user_data){
                        gameEnd.scores[user.user_id] = {
                            user_id: user.user_id,
                            points: user.point_num,
                            score: user.score,
                            luck: user.luck_score,
                        };
                        gameEnd.time = event.startTime;
                    }
                    break;
                case 7: // reveal new dora indicator
                    break;
                case 8: // happens 6 times, seems to be related to auto kan?
                    break;
                case 9: // no idea what this is, the telegram is empty
                    break;
                case 10:
                    break;
                case 11: //tenpai
                    break;
                default:
                    console.log('');
                    console.log(event);
                    console.log(parsed);
                    console.log('');
                    throw new Error(`unhandled event: ${event.eventType}`);
            }
        }
        //console.log(roundPlayers);
                    /*
                    console.log('');
                    console.log(event);
                    console.log(parsed);
                    console.log('');
                    */


        let thisRound = {
            roundnum: roundNum,
            roundtext: roundText,
            players: roundPlayers,
            winner: winner,
            game_id: gamelog.keyValue,
            game_type: `Players: ${gamelog.playerCount}, Winds: ${gamelog.round}`,
            game_start: gamelog.nowTime,
        };
        for(const [key, value] of Object.entries(roundPlayers)){
            let yakitori = value.yakitori;
            let dealerships = Players[key].dealerships + value.is_dealer;
            let riichis = Players[key].riichis + value.in_riichi;
            let hands_won = Players[key].hands_won + value.win;
            let tsumos = Players[key].tsumos + value.tsumo;
            let tenpais = Players[key].tenpais + value.tenpai;
            let furitens = Players[key].furitens + value.furiten;
            let no_yakus = Players[key].no_yakus + value.noyaku;
            let atozukes = Players[key].atozukes + value.atozuke;
            let toki = Players[key].toki + value.toki;
            let saki = Players[key].saki + value.saki;
            let doras_this_round = Players[key].doras_this_round + value.dora;
            let teru = Players[key].teru;
            let kuro = Players[key].kuro;
            let curr_win_streak = Players[key].won_this_streak;
            //teru
            let keep_streak = value.win;
            if(value.on_streak && (value.win > 0 || value.tenpai_at_draw && curr_win_streak)){
                curr_win_streak = Players[key].won_this_streak + 1;
                console.log(keep_streak);
                keep_streak = 1;
                if(teru < curr_win_streak) teru = curr_win_streak;
            }
            if(teru == 0 && value.win > 0) teru = 1;
            //kuro
            if(kuro < doras_this_round) kuro = doras_this_round;

            Players[key] = {
                uid: value.uid,
                uname: value.uname,
                yakitori: yakitori,
                dealerships: dealerships,
                on_streak: keep_streak,
                won_this_streak: curr_win_streak,
                doras_this_round: doras_this_round,
                riichis: riichis,
                hands_won: hands_won,
                tsumos: tsumos,
                tenpais: tenpais,
                furitens: furitens,
                no_yakus: no_yakus,
                atozukes: atozukes,
                teru: teru,
                toki: toki,
                saki: saki,
                kuro: kuro,
                riichi_turns: Players[key].riichi_turns,
                winning_tiles: Players[key].winning_tiles,
                score_progression: Players[key].score_progression,
                rounds: Players[key].rounds,
            }
            if(value.wintile != null) Players[key].winning_tiles.push(value.wintile);
            if(value.riichi_declared != null) Players[key].riichi_turns.push(value.riichi_declared);
            Players[key].score_progression.push(value.start_score);
            Players[key].rounds.push(value);

        }
        Rounds.push(thisRound);
        roundNum++;
    }
    
    for(const [key, value] of Object.entries(gameEnd.scores)){
        Players[key].score_progression.push(value.points);
    }
    //console.log(Players);
    return Players;
    //console.log(Rounds);
}
function getPrize(yaku){
    //Saki award - check if they got rinshan kaihou
    let saki = 0;
    if(yaku[0].hasOwnProperty(sakiAward)){
        saki = 1;
    }

    //Toki award - Check if they scored riichi ippatsu tsumo
    let toki = 0;
    if(yaku[0].hasOwnProperty(tokiAward[0]) && yaku[0].hasOwnProperty(tokiAward[1]) && yaku[0].hasOwnProperty(tokiAward[2])){
        toki = 1;
    }

    //kuro award
    let kuro = 0;
    for(const key of kuroAward){
        if(yaku[0].hasOwnProperty(key)){
            kuro += yaku[0][key];
        }
    }

    return [saki,toki,kuro];
}
function timeStats(gamelog){
    let startTime = gamelog.handRecord[0].handEventRecord[0].startTime;
    const lastHandRecord = gamelog.handRecord.length-1;
    const handEventRecord = gamelog.handRecord[lastHandRecord].handEventRecord.length - 1;
    let endTime = gamelog.handRecord[lastHandRecord].handEventRecord[handEventRecord].startTime;
    return endTime - startTime;
}
function calcRoundName(rep,round,wind,mode){
    //mode is either 3 or 4 players
    //wind has to be a wind tile, 49,65,81,97
    const turn = ((round-1) % mode) + 1;
    wind = (wind-1)/16 - 3;
    let textWind = '';
    switch(wind){
        case 0:
            textWind = 'East';
            break;
        case 1:
            textWind = 'South';
            break;
        case 2:
            textWind = 'West';
            break;
        case 3:
            textWind = 'North';
            break;
        default:
            throw new Error(`wind is out of range -turn: ${turn}, -wind ${wind}, -mode ${mode}`);
    }
    let output = `${textWind} ${turn}`;
    if(rep > 0){
        output += ` repeat ${rep}`;
    }
    return output;
}
function translateTile(tile,text){
   /* if text is 0 return tenhou notation i.e 15, 42, 20, honor aka is ignored, tsumogiri and calls are not added here
    * if text is 1 return notation format i.e. 5p, 2z, 0s -will always denote aka dora as 0, honor aka is ignored
    * if text is 2 return text format i.e. 5 pin, south, aka 5 sou
    * riichi city encodes their tiles by power of 16
    * pinzu is 0x00n, souzu is 0x01n, manzu is 0x02n
    * honors are separated each by 16, so east is 0x031 and chun is 0x091
    * red tiles are separated by 255 -> aka 5p is 0x105, aka 5s is 0x115, aka 5m is 0x125
    */
    if(tile == 0) throw new Error('invalid value');
    let is_aka = tile > 255;
    let num = tile % 16;
    let suit = ((tile - num) / 16) % 16 +1;

    if(suit < 4){
        switch(text){
            case 0:
                if(is_aka) return suit*10;
                return suit*10 + num;
            case 1:
                if(is_aka) return `0${suits_short[suit-1]}`;
                return `${num}${suits_short[suit-1]}`;
            case 2:
                if(is_aka) return `Aka ${num} ${suits_long[suit-1]}`;
                return `${num} ${suits_long[suit-1]}`;
            default:
                throw new Error(`text format out of range, expected 0 - 2, but recieved: ${text}`);
        }
    }else{
        switch(text){
            case 0:
                return 40 + suit -3;
            case 1:
                return `${suit - 3}z`;
            case 2:
                if(is_aka) return `Aka ${honours[suit-4]}`;
                return `${honours[suit-4]}`;
            default:
                throw new Error(`text format out of range, expected 0 - 2, but recieved: ${text}`);
        }
    }
}
function parseYakus(fang_list){
    let yaku = {};
    let yakuman = {};
    let yakuman_num = 0;
    let yaku_sum = 0;
    for(const entry of fang_list){
        yaku_sum += entry.fang_num;
        if(yakus.doras.includes(entry.fang_type)){
            yaku[yakus[yaku_language][entry.fang_type]] = entry.fang_num; //add the amount of han the doras scores
        }else{
            yaku[yakus[yaku_language][entry.fang_type]] = 1;
        }
        if(yakus.yakuman[entry.fang_type]){
            yakuman_num += yakus.yakuman[entry.fang_type];
            yakuman[yakus[yaku_language][entry.fang_type]] = 1;
        }
    }
    if(!yakuman_num && yaku_sum >= 13){
        yakuman_num = 1;
        yakuman['Kazoe Yakuman'] = 1;
    }
    return [yaku,yakuman,yakuman_num];
}
function compileYakuman(yaku,paifu,round){
    let key = Object.entries(yaku[1])[0][0];
    let yakunum = 0;
    let yakugames = [];
    if(yakuman.hasOwnProperty(key)){
        yakunum = yakuman[key].yakunum;
        yakugames = yakuman[key].yakugames;
    }
    yakunum += 1;
    yakugames.push([paifu,round]);
    yakuman[key] = {
        yakunum: yakunum,
        yakugames: yakugames,
    }
}
function getYakuman(){
    for(const [key, entry] of Object.entries(yakuman)){
        console.log(`\n${key}\tTimes: ${entry.yakunum}\t`);
        let i = 1;
        for(const game of entry.yakugames){
            console.log(`\t${i}:\t${game[0]}\t${game[1]}`);
            i++;
        }
    }
    return yakuman;
}
function savePlayers(players){
    return new Promise(resolve =>{
		data = JSON.stringify(players, null, 2);
		fs.writeFile(`./stats/players.json`,data,(err)=>{
			if(err) throw err;
			resolve();
		});
	});
}

exports.load = loadGame;
exports.downloadGame = downloadGame;
exports.parse = parse;
exports.timeStats = timeStats;
exports.getYakuman = getYakuman;
exports.translateTile = translateTile;
exports.savePlayers = savePlayers;