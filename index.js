require('dotenv').config();

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const mongo = require('./mongo');
const bodyParser = require('body-parser')

const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});
const documents = {};

io.on('connection', (socket) => {
    console.log('connected');
    let previousId;
    const safeJoin = (currentId) => {
        socket.leave(previousId);
        socket.join(currentId);
        previousId = currentId;
    };

    socket.on("angular", (message) => {
        console.log(message);
    });

    socket.on("getDoc", docId => {
        safeJoin(docId);
        socket.emit("document", documents[docId]);
    });

    socket.on("addDoc", doc => {
        documents[doc.id] = doc;
        safeJoin(doc.id);
        io.emit("documents", Object.keys(documents));
        socket.emit("document", doc);
    });

    socket.on("editDoc", doc => {
        documents[doc.id] = doc;
        socket.to(doc.id).emit("document", doc);
    });

    // io.emit("documents", Object.keys(documents));
    socket.on('new-message', (message) => {
        io.emit('new-message', message);
    });

    io.on('connection', function (socket) {
        socket.on('sendMessageToWhats', function (msg) {
            console.log('send message to whats');
            console.log(msg);

            //io.sockets.emit('chat message', 'sent message: ' + JSON.stringify(msg));
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = require('twilio')(accountSid, authToken);

            client.messages
                .create({
                    from: 'whatsapp:+14155238886',
                    body: msg.message,
                    to: 'whatsapp:+' + msg.To
                }).then(result => {
                    io.sockets.emit('chat message', JSON.stringify(result));
            });
        });
    });
});

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
    io.sockets.emit('chat message', JSON.stringify(req.body));
    res.status(201).json(result);
})

app.post('/sendMessage', async (req, res) => {
    const to = req.body.To
    const message = req.body.message
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const result = await client.messages
        .create({
            from: 'whatsapp:+14155238886',
            body: message,
            to: 'whatsapp:+' + to
        });

    res.json(result);

});

const port = process.env.PORT || 3000
http.listen(port, () => {
    console.log('Server is running');
});

bootstrap();