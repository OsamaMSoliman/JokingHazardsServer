const Joi = require('joi')
const express = require('express')

/**================================================================================================= */

const app = express()
const port = process.env.PORT || 2888
const msgSchema = {
    roomId: Joi.string().required(),
    playerId: Joi.string().required(),
    cardId: Joi.number().min(-1).max(360).required(),
}
const rooms = {}
const joint_match = []
const MAX = 4
const MIN = 3
const DELAY_BEFORE_MATCH = 20 * 1000
let timerAlreadyStarted = false
let timer

/**================================================================================================= */

function getNewRandomStringFor(dic) {
    let r
    do {
        r = Math.random().toString(36).substring(2);
    } while (r in dic)
    return r
}

function createRoom(size) {
    return {
        roomSize: size,
        judgeIndex: 0,
        players: {}
    }
}

function getRandomCard() { return Math.random()  * 360 }

function sendToAllMatchStarted() {
    let rid = getNewRandomStringFor(rooms)
    rooms[rid] = createRoom(joint_match.length)

    joint_match.forEach((res, i) => {
        let pid = getNewRandomStringFor(rooms[rid].players)
        res.send({
            "roomId": rid,
            "playerId": pid,
            "isJudge": i==rooms[rid].judgeIndex,
            "cardId": getRandomCard()
          })
        rooms[rid].players[pid] = null
    });
    joint_match.length = 0
}

function sendToJudge(roomId, cardId) {
    const thePlayers = rooms[roomId].players
    for(const p in thePlayers){
        if(p!= rooms[roomId].j&& thePlayers[p]){
            thePlayers[p].send()
        }
    }
}

function sendToAllExceptJudge(roomId,cardId) {
    
}

/**================================================================================================= */
app.use(express.json()) // enable parsing json objects in the body of the request
app.listen(port, () => {
    console.log(`listening on port ${port}`);
})

app.get('/', (request, response) => {
    if (joint_match.length >= MAX) {
        clearTimeout(timer)
        sendToAllMatchStarted()
    }
    joint_match.push(response)
    if (joint_match.length >= MIN && !timerAlreadyStarted) {
        timer = setTimeout(sendToAllMatchStarted, DELAY_BEFORE_MATCH);
        timerAlreadyStarted = true
    }
})

app.get('/friends', (request, response) => {
    console.log(request.headers)
    console.log("===========================================")
    console.log(response.headers)
    response.status(404).send("Not Implemented Yet!")
})

app.post('/', (request, response) => {
    const result = Joi.validate(request.body, msgSchema)
    if (result.error) return response.status(400).send(result.error)
    let roomId = request.body.room
    let playerId = request.body.playerId
    if(roomId in rooms && playerId in rooms[roomId].players){
        if(Object.keys(rooms[roomId].players).indexOf(playerId) == rooms[roomId].judgeIndex){
            // TODO send to all except the judge the selected cardId
        }else{
            // TODO send that card to the judge to choose
        }
    }else{
        response.status(406).send(result)
    }
})