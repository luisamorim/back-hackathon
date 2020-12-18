const twilio = require('./twilio');
const mongo = require('./mongo');

var _socket = {};

_socket.init = function (http) {

  const io = require('socket.io')(http, {
    cors: {
      origin: '*'
    }
  });

  io.on('connection', (socket) => {

    console.log('connected', socket.id);

    socket.on('sendMessageToWhats', function (msg) {
      console.log('send message to whats');
      console.log(msg);
      twilio.sendMessage(msg.To, msg.message.toString()).then(result => {
        socket.emit('chat message', JSON.stringify(result));
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

  return io;
}

module.exports = _socket;