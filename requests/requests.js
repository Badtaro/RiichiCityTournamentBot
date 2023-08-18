const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');
const fetch = require('node-fetch');
const logindata = require('./logindata.js');
const config = require('../config.js');

/*
If you get error using this script that a value hasn't been exported, then it's because you didn't run setup() first
Remember to update ./logindata.js, it will not run right out of the box
*/
let is_logged_in = false;
let domain = '';
let SID = '';
let UID = '';	//this is the userid, it's not required to set to anything, the code should do it dynamically when you log in
let defHeader = '';
const version = '1.1.4.11030'	//updating the version shoudln't be neccesary, but you could try it if the login fails
const deviceid = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"	//same goes for device ID

//this fetches the domain and confirms it works
function setup(){
    return new Promise(async(resolve, reject) => {
        domain = await getDomain().catch(e =>{
            reject(e);
        });
        resolve(1);
        console.log(domain);
    });
}
//this function fetches the server domain 
function getDomain(){
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream("domain.json");	//we are going to save the domain info into a file
		//this address contains the domain info
        const req = https.get('https://d3qgi0t347dz44.cloudfront.net/release/notice/domain_name.ncc', response => {
            const code = response.statusCode ?? 0	//return 0 if the value is null
            if (code >= 400) {	//requests usually fail with error codes bigger than 400
                reject(new Error(response.statusMessage));
            }
            response.pipe(file);	//tell the filestream to save the response as a file

            // after download completed close filestream
            file.on("finish", async () => {
                file.close();
				//parse the domain so we have a target for our requests
                const domain = await parseDomain();
                resolve(domain);
            });
        });
    });
}
//this updates the header
function refreshHeader(){
	//this is the header that is usually used when doing requests
    defHeader = {
        'User-Agent': 'UnityPlayer/2019.4.23f1 (UnityWebRequest/1.0, libcurl/7.52.0-DEV)',
        'Cookies': `{"channel":"default","lang":"en","deviceid":"${deviceid}","sid":"${SID}","uid":${UID},"region":"cn","platform":"pc","version":"${version}"}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Unity-Version': '2019.4.23f1'
    };
}
//this parses the domain file
function parseDomain(){
    return new Promise((resolve, reject) => {
        fs.readFile('domain.json',(err,data)=>{
            if(err){
                reject(err);
            }
            const json = JSON.parse(data);	//the file is actually a json, not a ncc file lmao
            resolve(json.domain_name);	//this is the attribute we're intrested in
        });
    });
}
//this is the function that should be run when initializing the script
async function login(){
    //fetch domain name
    await setup();
    //get SID - Session Identification
    SID = await fetchSID().catch(err =>{
        throw err;
    });
    //log in
	//also saves UID - User Identification
    UID = await fetchLogin().catch(err =>{
        throw err;
    });
    is_logged_in = true;
    exports.logged_in = is_logged_in; //Ask Klorofin
    refreshHeader();	//now that we have all of the data needed, we refresh the header
}
//fetch the session ID token
function fetchSID(){
    return new Promise((resolve, reject) =>{
		//this is a http request
		//just ignore the header portion, it just contains info that the server expects, it shouldn't need to change.
        fetch(`https://${domain}/users/initSession`, {
            method: 'POST',
            headers: {
                'Cookies': `{"channel":"default","deviceid":"${deviceid}","lang":"en","version":"${version}","platform":"pc"}`
            }
        }).then(response => response.json())
          .then((data) => resolve(data.data)) //data.data contains the SID we're looking for
          .catch(err =>{
            reject(err);
        });
    })
}
//validate the session ID token, this is effectively the 'login' portion of the script
function fetchLogin(){
    return new Promise((resolve, reject) =>{
		//here we validate out SID, the password and email is being passed from the logindata.js file
        fetch(`https://${domain}/users/emailLogin`, {
            method: 'POST',
            headers: {
                'Cookies': `{"channel":"default","deviceid":"${deviceid}","lang":"en","sid":"${SID}","version":"${version}","platform":"pc"}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: logindata
        }).then(response => {
            response.json()	//convert the response to json
            .then((data) => {
                if(data.code == 0){	// 0 is a successful code for some reason.
                    console.log(`Logged into Riichi city as ${data.data.user.nickname}`);
                    resolve(data.data.user.id);
                }else{
                    console.log(`Error message from server: ${data.message}`);
                    console.log(data);
                    console.log(response);
                    reject(data.message);
                }
            })
            .catch(err => {
                reject(err);
            });
        });
    });
}
//fetch tournament info, retrieves information about target tournament
function fetchTournament(id){
	//id is the target tournament's id
    return new Promise((resolve, reject) =>{
        if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
        fetch(`https://${domain}/lobbys/enterSelfBuild`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                'id': id
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data)
            })
            .catch(err => {
                reject(err);
            });
        });
    });
	/* Response
		classifyID:
        isAdmin:
        isCanReady:
        isCollect:
        lateRoomRank:
        lateTotalScore:
        matchID:
        matchInfo: {
            "briefIntroduction":
            "endTime":
            "enterPassWord":
            "enterRulesType":
            "fightType":
            "fristReqPoints":
            "highStageRank":
            "initialPoints":
            "isAddUpYakuman":
            "isChiDuan":
            "isChiTi":
            "isConvenientTips":
            "isCutOff":
            "isFourGang":
            "isFourRiichi":
            "isFourWinds":
            "isGangDora":
            "isGangLiDora":
            "isGangOpen":
            "isGangPay":
            "isKaiLiZhi":
            "isKnock":
            "isLastHeEnd":
            "isLastTingEnd":
            "isLiDora":
            "isLuck":
            "isMinusRiichi":
            "isMultipleYakuman":
            "isNanXiRu":
            "isNineCards":
            "isOfficial":
            "isOpenFace":
            "isPayYakuman":
            "isPublic":
            "isQiangGang":
            "isQieShang":
            "isRenHe":
            "isSameOrder":
            "isShaoJi":
            "isThreeHe":
            "isTimeLimit":
            "isTopReward":
            "isYiFa":
            "limitTime":
            "lowStageRank":
            "matchRulesType":
            "minimumPoints":
            "name":
            "numRedCard":
            "operFixedTime":
            "operVarTime":
            "orderPoints":
            "penaltyInfo": [
                {
                    "num":
                    "pointsCount":
                },{etc...}}
            "playerCount":
            "round":
            "startTime":
            "threeZiMoType":
            "timeLimitType":
            "type":
        }
        onlineSize:
        ownerID:
        rank:
        roomSize:
        status:
	*/
}
//fetch the logs in target tournament
function fetchTournamentLogList(classifyID,lastID=0){
	// classifyID is the internal tournament reference. this is the only function that uses the internal reference.
	//you can get this internal reference by running fetchTournament(<tournamentID>).classifyID

	// lastID is a variable used to denote how far back it should start
	//	-a value of 20 would make it fetch games starting from index 20 and down to the last or to 40

	//responses are always in chronological order (recent games first)
	//it always returns 20 or less results depening on how many games have been played
    return new Promise((resolve, reject) =>{
        if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
        fetch(`https://${domain}/record/readPaiPuList`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                "endTime":0,
                "skip":lastID,
                "startTime":0,
                "classifyID":classifyID,
                "isSelf":true,
                "limit":20,
                "gamePlay":1002
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data)
            })
            .catch(err => {
                reject(err);
            });
        });
    });
    /* Response looks like
     *  [{
     *  endTime:
     *  gamePlay:
     *  isClear:
     *  isCollect:
     *  isMiddlePause:
     *  paiPuId:
     *  paiPuNotId:
     *  playerCount:
     *  players: [{
     *      isExistYiMan: 
     *      nickname:
     *      points:
     *      roleID:
     *      skinID:
     *      userId:
     *      },{etc...}]
     *  },etc...]
     */
}
//fetch the online status of participants *
function fetchTournamentPlayers(id){
	//id is the target tournament id, the request here is really misleading.
	//direct your complaints to Riichi City lmao.
    return new Promise((resolve, reject) =>{
        if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
        fetch(`https://${domain}/lobbys/getSelfManageInfo`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                'matchID': id
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data)
            })
            .catch(err => {
                reject(err);
            });
        });
    });
    /* Response looks like
     *  
     * [{
     * nickname:nick
     * status:1    //status, 1 means in lobby(not readied up), 2 readied up, 3 ingame, 4 not in lobby/not logged in
     * userID: uid //userid, same as friend code
     * }]
     * 
     */
}
//Start a game with a player list *
function startTournamentGame(players,id){
	//players should be an array with the uids of all the players and the position they are playing in.
	//meaning pos 0 is east, pos 1 is south, etc... 
	// East			South		West		North
	//[player1_ID, 	player2_ID, player3_ID,	player4_ID]

	//NB! 	MAKE SURE THAT THE PLAYERS ARE ALL READIED UP
	//		MAKE SURE THAT THE AMOUNT OF PLAYERS MATCHES THE GAMEMODE
    return new Promise((resolve, reject) =>{
        if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
        fetch(`https://${domain}/lobbys/allocateSelfUser`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                'usersID': players,
                'matchID': id,
                'table_idx':1,
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data)
            })
            .catch(err => {
                reject(err);
            });
        });
    });
    /* Response looks like:
     *
     *  true
     *
     * lmao, really stupid ikr.
	 * if it returns false, something failed
     */
}
//fetch live games in target tournament
function fetchOngoingGames(classifyID){
	// classifyID is the internal tournament reference. this is the only function that uses the internal reference.
	// you can get this internal reference by running fetchTournament(<tournamentID>).classifyID
    return new Promise((resolve, reject) =>{
        if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
        fetch(`https://${domain}/record/readOnlineRoom`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                'stageType':0,
                'round':2,
                'matchType':1,
                'classifyID': classifyID,
                'gamePlay':1002,
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data)
            })
            .catch(err => {
                reject(err);
            });
        });
    });
    /* Response looks like
     * [{
     * isEnd: false -if game is ongoing
     * isPause: false -if game is paused
     * nowTime: 'timestamp' -unsure if this is when game started
     * players: [
     *   {
     *      headtag: 0,
     *      nickname: 'name',
     *      position: 0,
     *      profileFrameId: 30000,
     *      roleID: 10001,  //character
     *      skinID: 1,      //character skin
     *      stageLevel: 1,
     *      userId: uid
     *   }, etc...
     * ]
     * roomId: 'string', incidentally also the paifu for the log after the game concludes
     * startTime: 'timestamp' -when game started, timestamp is in ms since epoch
     * }, etc...]
     *  message: OK
     *  round: 2 //hanchan
     *  stagetype:0
     */
}
//pause/unpause or terminate target game in target tournament *
function manageTournamentGame(roomID,type, id){
	//roomID is the unique game room ID, you can get this from fetchOngoingGames(classifyID)
	//the game needs to be ongoing, otherwise it will throw an error

    //type 1 is pause, 2 is unpause, 3 is terminate

	//id is the tournament id, again; very misleading, complain to Riichi City about it lol
    return new Promise((resolve, reject) =>{
        if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
        fetch(`https://${domain}/lobbys/controlSelfRoom`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                'roomID': roomID,
                'type':type,
                'matchID': id,
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data)
            })
            .catch(err => {
                reject(err);
            });
        });
    });
    /* Response looks like:
     *
     *  true
     *
     * lmao, really stupid ikr.
	 * 
	 * returns false if it failed for some reason
     */
}
//fetch game log from target paifu
function fetchLog(paifu){
	//paifu is the unique game identifier, you can get this one by running fetchTournamentLogList(classifyID,lastID) and taking any of the paiPuId
    if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
    return new Promise((resolve, reject) =>{
        fetch(`https://${domain}/record/getRoomData`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                "isObserve": false,
                "keyValue": paifu
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data);
            })
            .catch(err => {
                reject(err);
            })
        });
    });
	//response is a huge json file, it's too large to document here, check out ../scripts/rcGameLogV2.js for better documentation
}
//this function will take a riichi city friend code and return a player object.
//you can use this to get an updated list over registrated member names to display on stats.
function findPlayer(uid){
    return new Promise((resolve, reject) =>{
        if(!is_logged_in) reject(new Error('You need to use .login() first!!'));
        fetch(`https://${domain}/mixed_client/findFriend`, {
            method: 'POST',
            headers: defHeader,
            body: JSON.stringify({
                findType: 2, 
                content: uid.toString(),
            })
        }).then(response => {
            response.json()
            .then((data) => {
                resolve(data.data)
            })
            .catch(err => {
                reject(err);
            });
        });
    });
}
exports.login = login;
exports.fetchTournament = fetchTournament;
exports.fetchLog = fetchLog;
exports.fetchTournamentLogList = fetchTournamentLogList;
exports.fetchTournamentPlayers = fetchTournamentPlayers;
exports.startTournamentGame = startTournamentGame;
exports.fetchOngoingGames = fetchOngoingGames;
exports.manageTournamentGame = manageTournamentGame;
exports.findPlayer = findPlayer;
exports.logged_in = is_logged_in;