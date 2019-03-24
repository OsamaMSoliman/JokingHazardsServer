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
        judgeId: null,
        players: {}
    }
}

function getRandomCard() { return Math.floor(Math.random() * 360) }

function sendToAllMatchStarted() {
    const rid = getNewRandomStringFor(rooms)
    rooms[rid] = createRoom(joint_match.length)
    const cardId = getRandomCard()

    joint_match.forEach((res, i) => {
        const pid = getNewRandomStringFor(rooms[rid].players)
        res.send({
            "roomId": rid,
            "playerId": pid,
            "isJudge": i == 0,
            "cardId": cardId
        })
        rooms[rid].players[pid] = null
    });
    joint_match.length = 0
}

function sendToJudge(roomId, judgeId, cardId) {
    const thePlayers = Object.keys(rooms[roomId].players)
    const x = thePlayers.indexOf(judgeId)++
    // TODO
    if (thePlayers[x])
        thePlayers[x].send(cardId)

}

function sendToAllExceptJudge(roomId, cardId) {
    const thePlayers = rooms[roomId].players
    for (const pid in thePlayers) {
        if (pid != rooms[roomId].judgeId && thePlayers[pid]) {
            // TODO
            thePlayers[pid].send(cardId)
        }
    }
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

app.post('/', (request, response) => {
    const result = Joi.validate(request.body, msgSchema)
    if (result.error) return response.status(400).send(result.error)
    let roomId = request.body.room
    let playerId = request.body.playerId
    if (roomId in rooms && playerId in rooms[roomId].players) {
        if (playerId == rooms[roomId].judgeId) {
            // if(Object.keys(rooms[roomId].players).indexOf(playerId) == rooms[roomId].judgeIndex){
            // TODO send to all except the judge the selected cardId
            sendToAllExceptJudge(roomId, request.body.cardId)
        } else {
            // TODO send that card to the judge to choose
            sendToJudge(roomId,playerId,request.body.cardId)
        }
    } else {
        response.status(406).send(result)
    }
})

app.get('/debug',(request,response)=>{
    response.send(rooms)
})

app.get('/friends', (request, response) => {
    response.status(404).send("Not Implemented Yet!")
})