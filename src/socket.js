const twilio = require('./twilio');

var _socket = {};


_socket.init = function(http){
    
    const io = require('socket.io')(http, {
        cors: {
            origin: '*',
        }
    });

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
    
        socket.on('new-message', (message) => {
            io.emit('new-message', message);
        });
    
        socket.on('sendMessageToWhats', function (msg) {
            console.log('send message to whats');
            console.log(msg);
            twilio.sendMessage(msg.To, msg.message.toString()).then(result => {
                socket.emit('chat message', JSON.stringify(result));
                
            })
        });

        
    });

    return io;
}

module.exports = _socket;