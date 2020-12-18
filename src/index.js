require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const mongo = require('./mongo');
const bodyParser = require('body-parser')
const twilio = require('./twilio');
const socket = require('./socket').init(http);


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static('public'));


async function bootstrap() {
    mongo.connect();
}

app.get('/healthcheck', (req, res) => {
    res.end('It\'s Alive!');
});

app.get('/webhooks', async (req, res) => {
    const result = await mongo.getInstance().collection('webhooks').find({}).toArray();
    res.status(200).json(result);
});

app.post('/webhooks', async (req, res) => {
    console.log('webhooks received:');
    console.log(req.body);
    const result = await mongo.getInstance().collection('webhooks').insertOne(req.body);
    socket.emit('chat message', JSON.stringify(req.body));
    res.status(201).json(result);
})

app.post('/sendMessage', async (req, res) => {
    const to = req.body.To
    const message = req.body.message
    const result = twilio.sendMessage(to,message);
    res.json(result);

});

const port = process.env.PORT || 3000
http.listen(port, () => {
    console.log('Server is running');
});

bootstrap();