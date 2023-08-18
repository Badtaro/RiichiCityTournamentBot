/**********************************************************************************************


											NB!
			THIS SCRIPT IS NOT COMPLETE, AS SUCH IT MIGHT NOT WORK AS EXPECTED
						NAG KLORO TO FIX IT IF YOU REALLY NEED IT



**********************************************************************************************/


const fs = require('fs');
const requests = require('../requests/requests.js');
const yakus = require('./yakus.js')

const suits_short = ['p','s','m'];
const suits_long = ['pin','sou','man'];
const honours = ['East', 'South', 'West', 'North', 'Haku', 'Hatsu', 'Chun'];
const yaku_language = 'English_weeb'; // also have English and Japanese
const sakiAward = yakus[yaku_language][3];
const tokiAward = [yakus[yaku_language][0],yakus[yaku_language][1],yakus[yaku_language][2]];
const kuroAward = [yakus[yaku_language][49],yakus[yaku_language][50],yakus[yaku_language][51],yakus[yaku_language][55]];
let yakuman = {};
let bait_time = [[],[],[]];

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
function parse(gamelog,Players,Games){
    //console.log(gamelog.keyValue);
    let Rounds = [];
    let gamePlayers = {};
    let gameEnd = {
        scores: {},
        time: 0,
    };
    const mode = gamelog.playerCount;
    //check if player already has stats and if not; instantiate them
    for(const player of gamelog.handRecord[0].players){
        gamePlayers[player.userId] = {
            user_id: player.userId,
            game_name: player.nickname,
            game_paifu: gamelog.keyValue,
            round_name: [],
            round_number: [],
            dice: [],
            hands_count: 0,
            seat_count: [0,0,0,0],
            hands_won: 0,
            game_won: 0,
            placements: [],
            ron_count: [],
            tsumo_count: [],
            chii_count: [],
            pon_count: [],
            kan_count: [[],[],[],[]],
            riichi_count: 0,
            riichi_won_count: 0,
            riichi_turns: [],
            tenpai_count: 0,
            tenpai_turns: [],
            tenpai_reject: 0,
            yakitori_count: 0,
            furiten_count: 0,
            no_yaku_count: 0,
            atozuke_count: 0,
            dora_count: [0,0,0,0],
            riichi_bets: 0,
            teru: 0,
            toki: 0,
            saki: 0,
            kuro: 0,
            on_streak: false,
            dice_rolls: [],
            time: [],
            riichi_turns: [],
            winning_tiles: [],
            score_progression: [],
            roundPlayer: [],
        }
    }
    //console.log(Players);
    let roundNum = 0;
    for(const round of gamelog.handRecord){
        let roundPlayers = {};
        let game_winner = [];
        let lastStamp = 0;		//might move these into the object
        let lastcallable = 0;	//might move these into the object
		let seat = 0;   //this only points to the seat relative to the original east player, but we can still use it to determine actual seat
        let roundGame = {
            round_text: calcRoundName(round.benChangNum,round.changCi,round.quanFeng,mode),
			paifu: gamelog.keyValue,
            riichi_sticks: 0,
            honba: 0,
            dora_indicators: [],
            uradora_indicators: [],
			dices: [],
            game_winner: [],
            players: [],
            wall: [],
        }
        for(const [key, player] of Object.entries(round.players)){
            //build single round object
            roundPlayers[player.userId] = {
                user_id: player.userId,				//done
                game_name: player.nickname,			//done
                game_paifu: gamelog.keyValue,		//done
                round_name: roundGame.round_text,	//done
                round_number: roundNum,				//done
                dice: [],							//done
                seat: null,							//done
                win: false,							//done
                ron: null,							//done
                tsumo: [],							//done
                chii: [],							//done
                pon: [],							//done
                kan: [[],[],[],[]],
                riichi: false,
                riichi_called: false,
                riichi_declared: null,
                tenpai: false,
                tenpai_at_draw: false,
                tenpai_turn: null,
                tenpai_reject: false,
				tenpai_reject_infos: [],
                yakitori: null,     //conviniently riichi city has a flag for this, just set this every round
                furiten: false,
                no_yaku: false,
                atozuke: false,
				turn_1win: false,
                dora: [0,0,0,0],
                toki: 0,
                saki: 0,
                on_streak: gamePlayers[player.userId].on_streak,
                win_tile: null,
                start_score: 0,
                starting_hand: [],
                final_hand:[],
                draws: [],
                rinshan_draws: [],
                discards: [],
                final_waits: [],
                all_waits: [],
                couldcalltiles:[],
                time: [[],[],[]],
                move_timer: [],
                possiblecalls: [0,0,0,0],
                yakus: {},
                waitbuffer: [], //used to cache tenpai info. use this to decide waits and whether or not that player is furiten.
            }
        }
        for(const event of round.handEventRecord){
            let parsed = JSON.parse(event.data);
            if(lastStamp == 0) lastStamp = event.startTime;
            if(event.userId != 0){
                roundPlayers[event.userId].time[0].push(event.startTime - lastStamp);
                roundPlayers[event.userId].time[1].push(event.eventType);
                roundPlayers[event.userId].time[2].push(parsed);
            }else{
                bait_time[0].push(event.startTime - lastStamp)
                bait_time[1].push(event.eventType)
                bait_time[2].push(parsed)
            }
            lastStamp = event.startTime;
            //console.log(event.eventPos);
            let yaku;
            let prize;
            switch(event.eventType){
                case 1: //starting hands
					if(seat == 0){	//do this only once at the start of the game
						roundGame.dora_indicators.push(parsed.bao_pai_card); //might have to return to this if somehow multiple doras are shown at the beginning of the game
						roundGame.riichi_sticks = parsed.li_zhi_bang_num;
						roundGame.honba = parsed.ben_chang_num;
						roundGame.dices = parsed.dices;
					}
                    roundPlayers[event.userId].dice = parsed.dices;
                    roundPlayers[event.userId].seat = calcSeatNum(seat, parsed.dealer_pos, Object.entries(round.players).length);
                    seat++;
					//add all tiles to that players start hand stat
                    for(const tile of sortTiles(parsed.hand_cards)) roundPlayers[event.userId].starting_hand.push(tile);
                    for(const player of parsed.user_info_list){
						//add start of round stats to player
                        roundPlayers[player.user_id].start_score = player.hand_points;
                        roundPlayers[player.user_id].yakitori = player.is_exist_shao_ji;
                    }
					if(parsed.ting_list.length){	//tenpai at initial hand
						roundPlayers[event.userId].turn_1win = true;
					}
                    break;
                case 2: //draw
                    if(parsed.in_ting_info.length){
                        if(parsed.in_ting_info[0].hasOwnProperty('ting_list')){
							//this means a player is now in tenpai
                            roundPlayers[event.userId].waitbuffer = parsed.in_ting_info;
                            for(const obj of parsed.in_ting_info){
                                //console.log(obj.discard_card);
                                //console.log(obj.ting_list);
                            }
                        }
                    }
                    roundPlayers[event.userId].move_timer.push(parsed.oper_var_time);
                    let cardDrawn = parsed.in_card
                    if(parsed.in_card == 0) cardDrawn = lastcallable;
                    if(parsed.in_card == 0 && lastcallable == 0) break;
                    roundPlayers[event.userId].draws.push(cardDrawn);
                    if(parsed.is_gang_incard){
                        roundPlayers[event.userId].rinshan_draws.push(cardDrawn);
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
                    roundPlayers[event.userId].move_timer.push(parsed.oper_var_time);
                    break;
                case 4: //discards or calls
                    switch(parsed.action){
                        case 2: //chi left x23s
                        case 3: //chi middle 2x4
                        case 4: //chi right 23x
                            roundPlayers[event.userId].chii.push(parsed.card);
                            break;
                        case 5: //pon
                            roundPlayers[event.userId].pon.push(parsed.card);
                            break;
                        case 6: //Open kan
                            roundPlayers[event.userId].kan[0].push(parsed.card);
                            roundPlayers[event.userId].kan[1].push(parsed.card);
                            break;
                        case 7: //ron
                            roundPlayers[event.userId].win = 1;
                            roundPlayers[event.userId].win_tile = parsed.card;
                            roundPlayers[event.userId].final_hand = parsed.hand_cards;

                            //winners should probably be set in round end event...

                            break;
                        case 8: //closed Kan
                            roundPlayers[event.userId].kan[0].push(parsed.card);
                            roundPlayers[event.userId].kan[3].push(parsed.card);
                            break;
                        case 9: //added kan
                            roundPlayers[event.userId].kan[0].push(parsed.card);
                            roundPlayers[event.userId].kan[2].push(parsed.card);
                            break;
                        case 10: //tsumo
                            roundPlayers[event.userId].win = 1;
                            roundPlayers[event.userId].tsumo = 1;
                            roundPlayers[event.userId].win_tile = parsed.card;
                            roundPlayers[event.userId].final_hand = parsed.hand_cards;

                            //winners should probably be set in round end event...
                            break;
                        case 11: //discard
                            //check for tenpai, if they are in riichi, we already wrote this data
                            //if the player has data in the waitbuffer, then we know they are in tenpai.
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
                                            let tile = waittile.ting_card;
                                            furiten += waittile.is_zhen_ting ? 1 : 0;   //zhen ting means furiten
                                            hasyaku += waittile.is_wu_yi ? 0 : 1;       //wu yi means no yaku, therefore if it's false you have yaku
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
                                    //player had the option of being in tenpai, but chose not to, increment tenpai reject counter
                                    roundPlayers[event.userId].tenpai_reject++;
									let reject = {
										hand: sortTiles(buildHand(roundPlayers[event.userId])),
										tile_discarded: parsed.card,
										tenpai_discards: [],
									}
									for(const entr of roundPlayers[event.userId].waitbuffer){
										reject.tenpai_discards.push(parseWait(entr));
									}
									roundPlayers[event.userId].tenpai_reject_infos.push(reject);
                                    //if the player isn't in tenpai, then remove these datapoints
                                    roundPlayers[event.userId].noyaku = 0;
                                    roundPlayers[event.userId].atozuke = 0;
                                    roundPlayers[event.userId].furiten = 0;
                                    roundPlayers[event.userId].final_waits = [];
                                }
                                //wipe the waitbuffer, since we already read from it. this will prevent overwriting of waits
                                roundPlayers[event.userId].waitbuffer = [];
                            }
                            if(parsed.is_li_zhi){
                                roundPlayers[event.userId].tenpai = 1;
                                roundPlayers[event.userId].in_riichi = 1;
                                roundPlayers[event.userId].riichi_declared = roundPlayers[event.userId].discards.length;
                            }
                            roundPlayers[event.userId].discards.push(parsed.card);
                            break;
                        case 13: //kita
                            roundPlayers[event.userId].kita++;
                            roundPlayers[event.userId].discards.push(parsed.card);
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
                                game_winner.push(winner.user_id);
                                yaku = parseYakus(winner.fang_info);
                                prize = getPrize(yaku);
                                roundPlayers[winner.user_id].win = 1;
                                roundPlayers[winner.user_id].saki = prize[0];
                                roundPlayers[winner.user_id].toki = prize[1];
                                roundPlayers[winner.user_id].dora = prize[2];
                                if(yaku[2]){
                                    compileYakuman(yaku,gamelog.keyValue,roundGame.round_text);
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
                                    compileYakuman(yaku,gamelog.keyValue,roundGame.round_text);
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
            roundtext: roundGame.round_text,
            players: roundPlayers,
            winners: game_winner,
            game_id: gamelog.keyValue,
            game_type: `Players: ${gamelog.playerCount}, Winds: ${gamelog.round}`,
            game_start: gamelog.nowTime,
        };
        //feed gamedata into player objects
		/*
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
                user_id: value.uid,
                game_name: value.uname,
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
            Players[player.userId] = {
                user_id: player.userId,
                game_name: player.nickname,
                hands_count: 0,
                hanchan_count: 0,
                seat_count: [0,0,0,0],
                games_won: 0,
                hands_won: 0,
                ron_count: 0,
                tsumo_count: 0,
                chii_count: 0,
                pon_count: 0,
                kan_count: [0,0,0,0],
                riichi_count: 0,
                riichi_won_count: 0,
                tenpai_count: 0,
                tenpai_reject: 0,
                yakitori_count: 0,
                furiten_count: 0,
                no_yaku_count: 0,
                atozuke_count: 0,
                dora_count: [0,0,0,0],
                riichi_bets: 0,
                teru: 0,
                toki: 0,
                saki: 0,
                kuro: 0,
                dice_rolls: [],
                time: [],
                riichi_turns: [],
                winning_tiles: [],
                score_progression: [],
                rounds: [],
            }
            if(value.wintile != null) Players[key].winning_tiles.push(value.wintile);
            if(value.riichi_declared != null) Players[key].riichi_turns.push(value.riichi_declared);
            Players[key].score_progression.push(value.start_score);
            Players[key].rounds.push(value);

        }
		*/
        Rounds.push(thisRound);
        roundNum++;
    }
    
    for(const [key, value] of Object.entries(gameEnd.scores)){
        //Players[key].score_progression.push(value.points);
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
function calcSeatNum(pos,dealer_pos,mode){
    //should return seat position form given arguments
    //pos = initial seat
    //dealer_pos = dealer seat
    //mode = amount of players; 3 for sanma, 4  for suuma

    let diff = pos - dealer_pos;
    if(diff < 0) diff += mode;
    return diff;
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
function sortTiles(arr){
	arr.sort((a,b) =>{
		//figure out what tile A is
		let num_a = a % 16;
		let sort_a = ((a - num_a) / 16) % 16 +1;
		let aka_a = a > 255;

		//figure out what tile B is
		let num_b = b % 16;
		let sort_b = ((b - num_b) / 16) % 16 +1;
		let aka_b = b > 255;

		//if the tiles are the same sort, we need to separate them by numbers
		if(sort_a == sort_b){
			//if the numbers are the same, we need to separate by aka
			if(num_a == num_b){
				//if both tiles are the same, we don't need to change the order at all
				if(aka_a == aka_b) return 0;
				//otherwise move akadora higher
				return aka_a > aka_b ? -1 : 1;
			}
			//otherwise move lower numbers lower
			return num_a < num_b ? -1 : 1;
		}
		//move lower numbered sorts lower
		return sort_a < sort_b ? -1 : 1;
	});
	return arr;
}
function buildHand(player){
	let starting_hand = player.starting_hand;
	let draws = player.draws;
	let discards = player.discards;
	
	//combine all tiles from startHand, draws and calls.
	//then remove tiles discarded and return the remainder
	let totals = [];
	for(const tile of starting_hand) totals.push(tile);
	for(const tile of draws) totals.push(tile);

	//remove tiles that were discarded
	for(const tile of discards){
		const index =  totals.indexOf(tile);
		totals.splice(index,1);
	}
	return totals;
}
function parseWait(wait_buffer_entry){
	let tile_to_discard = wait_buffer_entry.discard_card;
	let wait_data = {
		atozuke: false,
		sided_wait: wait_buffer_entry.ting_list.length,
		furiten: false,
		no_yaku: false,
		live_waits: 0,
		waits: [],
	};
	let yakus = 0;
	for(const entry of wait_buffer_entry.ting_list){
		let data = {
			wait_tile: entry.ting_card,
			live_waits: entry.left_num,
			furiten: entry.is_zhen_ting,
			no_yaku: entry.is_wu_yi,
			yaku_info: parseWaitYaku(entry.fang_info),
		}
		wait_data.live_waits += data.live_waits;
		if(data.furiten) wait_data.furiten = true;
		if(!data.no_yaku) yakus++;
		wait_data.waits.push(data);
	}
	if(yakus == 0){
		wait_data.no_yaku = true;
	}else if(yakus < wait_buffer_entry.ting_list.length){
		wait_data.atozuke = true;
	}
	return wait_data;
}
function parseWaitYaku(fang_info){
	let yaku = {};
	for(const [key,entry] of Object.entries(fang_info)){
		let yaku_number = parseInt(key);
		let yaku_worth = entry;
		yaku[yakus[yaku_language][yaku_number]] = yaku_worth;
	}
	return yaku;
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