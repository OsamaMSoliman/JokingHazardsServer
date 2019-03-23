const Joi = require('joi')
const express = require('express')

/**================================================================================================= */

const app = express()
const port = process.env.PORT || 2888
const msgSchema = {
    room: Joi.number().required(),
    card_id: Joi.number().min(-1).max(360).required(),
}
const rooms = {
    "roomID": {
        roomSize: 1,
        players: { "playerID": responseObject }
    }
}
const joint_match = []
const MAX = 4
const MIN = 3
let timerAlreadyStarted = false
let timer

/**================================================================================================= */

function getRandomIn(dic) {
    let r
    do {
        r = Math.random().toString(36).substring(2);
    } while (r in dic)
    return r
}

function createRoom(size) {
    return {
        roomSize: size,
        players: {}
    }
}

function sendToAllMatchStarted() {
    let rid = getRandomIn(rooms)
    rooms[rid] = createRoom(joint_match.length)

    joint_match.forEach((res, i) => {
        let pid = getRandomIn(rooms[rid].players)
        res.send({ "room": rid, "playerID": pid })
        rooms[rid].players[pid] = null
        //TODO: choose a judge
    });
    joint_match.length = 0
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
        timer = setTimeout(sendToAllMatchStarted, 30000);// 30 sec
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
    response.send(result)
})