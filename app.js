const Joi = require('joi')
const express = require('express')

/**================================================================================================= */

const app = express()
const port = process.env.PORT || 2888
const msgSchema = {
    roomId: Joi.string().required(),
    playerId: Joi.string().required(),
    // cardId: Joi.number().min(-1).max(360).required(),
    cardId: Joi.string().regex(/[0-9]+_[0-9]+|-1/).required(),
}
const rooms = {}
const joint_match = []
const MAX = 4
const MIN = 3
const DELAY_BEFORE_MATCH = 20 * 1000
const NUMBER_OF_PAGES = 20
const NUM_OF_CARDS_PER_PAGE = 6 * 3
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
        players: {},
        judgeChoices: [],
        didJudgePlayHisCard: false
    }
}

function getRandomCard() { return Math.floor(Math.random() * NUMBER_OF_PAGES) + "_" + Math.floor(Math.random() * NUM_OF_CARDS_PER_PAGE) }

function sendToAllMatchStarted() {
    const rid = getNewRandomStringFor(rooms)
    rooms[rid] = createRoom(joint_match.length)
    const cardId = getRandomCard()

    joint_match.forEach((res, i) => {
        const pid = getNewRandomStringFor(rooms[rid].players)
        if (i == 0) rooms[rid].judgeId = pid
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

function sendToAllExceptJudge(roomId, cardId) {
    const thePlayers = rooms[roomId].players
    for (const pid in thePlayers) {
        if (pid != rooms[roomId].judgeId && thePlayers[pid]) {
            thePlayers[pid].send({ listOfCardIds: [cardId] })
            thePlayers[pid] = null
        }
    }
}

function sendToJudge(roomId, judgeResponse) {
    const interval = setInterval(() => {
        if (rooms[roomId].judgeChoices.length > 0) {
            clearInterval(interval)
            judgeResponse.send({ listOfCardIds: rooms[roomId].judgeChoices })
        }
    }, 60 * 1000)
}

function nextJudge(roomId, judgeId) {
    const playerKeyArray = Object.keys(rooms[roomId].players)
    const indexOfNextJudge = playerKeyArray.indexOf(judgeId) + 1
    rooms[roomId].judgeId = playerKeyArray[indexOfNextJudge]
}

function saveResponseObj(roomId, playerId, responseObj) {
    rooms[roomId].players[playerId] = responseObj
}

/**================================================================================================= */
app.use(express.json()) // enable parsing json objects in the body of the request
// this to avoid: "no access-control-allow-origin" error
app.use((request, response, next) => {
    response.header("Access-Control-Allow-Origin", "*")
    response.header("Access-Control-Allow-Methods", "GET,POST")
    response.header("Access-Control-Allow-Headers", "Content-Type")
    next()
})
app.listen(port, () => {
    console.log(`listening on port ${port}`);
})

app.get('/', (request, response) => {
    if (joint_match.length >= MAX) {
        clearTimeout(timer)
        sendToAllMatchStarted()
        timerAlreadyStarted = false
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
    let roomId = request.body.roomId
    let playerId = request.body.playerId
    if (roomId in rooms && playerId in rooms[roomId].players) {
        if (playerId == rooms[roomId].judgeId) {
            if (rooms[roomId].didJudgePlayHisCard) {
                sendToAllExceptJudge(roomId, request.body.cardId)
                response.sendStatus(418)
                nextJudge(roomId, playerId)
            } else {
                rooms[roomId].didJudgePlayHisCard = true
                sendToAllExceptJudge(roomId, request.body.cardId)
                sendToJudge(roomId, response)
            }
        } else {
            saveResponseObj(roomId, playerId, response)
            // ! all clients must send this -1 request before the judge sending his card
            if (request.body.cardId != -1) {
                rooms[roomId].judgeChoices.push(request.body.cardId)
            }
        }
        console.log(rooms)
    } else {
        response.status(406).send(result)
    }
})

app.get('/debug', (request, response) => {
    response.send(rooms)
})

app.get('/friends', (request, response) => {
    response.status(404).send("Not Implemented Yet!")
})