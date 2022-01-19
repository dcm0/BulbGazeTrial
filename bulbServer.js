const app = require('express');
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
      origin: "*",
    }});


var cnsp = io.of('/controller');
nsp.on('connection', function(socket){
       console.log('controller connected');
       nsp.emit('hi', 'Hello controller');
});

var dnsp = io.of('/dashboard');
nsp.on('connection', function(socket){
   console.log('dash connected');
   nsp.emit('hi', 'Hello dash!');
});

// io.on('connection', (socket) => {

//   console.log('Connected');
//   console.log(socket.id);
//   console.log("JWT token test: ",socket.handshake.headers)

//   socket.on('event_name', (data) => {

//     console.log("Message from Client : ", data);

//     socket.broadcast.emit("Send Message socket.broadcast.emit : ", data);
//     io.emit("Send Message io.emit Broadcasted : ", data);
//     socket.emit("Send Message : ", data);

//   })
  
//   socket.on('disconnect', () => {

//     console.log('Disconnected');

//   })

// })

http.listen(8080, () => {

  console.log("Server launched on port 8080");
})


