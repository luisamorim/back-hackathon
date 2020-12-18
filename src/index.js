require('dotenv').config();

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
  });
var redis = require('socket.io-redis');

const mongo = require('./mongo');
const bodyParser = require('body-parser')
const twilio = require('./twilio');

var serverName = process.env.NAME || 'Unknown';
var redisHost = process.env.REDIS_HOST;
var redisPort = process.env.REDIS_PORT;
var redisAuth = process.env.REDIS_AUTH;

io.adapter(redis({ host: redisHost, port: redisPort, auth_pass: redisAuth }));

io.on('connection',(socket)=>{
    
    console.log('connected', socket.id);

    socket.on('sendMessageToWhats', function (msg) {
        console.log('send message to whats');
        console.log(msg);
        twilio.sendMessage(msg.To, msg.message.toString()).then(result => {
            io.sockets.emit('chat message', JSON.stringify(result));
        })
      });
  
      socket.on('new-message', async (message) => {
        await mongo.getInstance().collection('message').insertOne(message);
        socket.emit('new-message', message);
        socket.to(`${message.sendTo._id}`).emit('new-message', message);
      });
  
      socket.on('update-message', async (message) => {
        await mongo.getInstance().collection('message').findOneAndUpdate({ _id: message._id }, { $set: message });
        socket.to(message.sendBy.socketId).emit('updated-message', message);
        socket.to(message.sendTo.socketId).emit('updated-message', message);
      });
  
      socket.on('all-messages', async (params) => {
        let result;
        if (params) {
          var query = {
            "sendBy._id": { $in: [params.sendBy, params.sendTo] },
            "sendTo._id": { $in: [params.sendBy, params.sendTo] }
          }
          result = await mongo.getInstance().collection('message').find(query).toArray();
        } else {
          result = await mongo.getInstance().collection('message').find().toArray();
        }
        socket.emit('all-messages', result);
      });
  
      socket.on('new-user', async (user) => {
        const result = await mongo.getInstance().collection('user').findOne({ username: user.username });
        if (result) {
          socket.emit('logged-in', result);
          socket.join(`${result._id}`);
        } else {
          await mongo.getInstance().collection('user').insertOne(user);
          socket.emit('logged-in', user);
          io.emit('new-user', user);
          socket.join(`${user._id}`);
        }
      });
  
      socket.on('all-users', async () => {
        const result = await mongo.getInstance().collection('user').find().toArray();
        socket.emit('all-users', result);
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
    const data = req.body;    
    io.sockets.emit('chat message', JSON.stringify(data));
    res.status(201).json(result);
})

app.post('/sendMessage', async (req, res) => {
  const to = req.body.To
  const message = req.body.message
  const result = twilio.sendMessage(to, message);
  res.json(result);

});

const port = process.env.PORT || 3000

server.listen(port, () => {
    console.log('Server is running: ',serverName);
});

bootstrap();