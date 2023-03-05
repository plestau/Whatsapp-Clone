const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const fileUpload = require('express-fileupload');
const fs = require('fs');
//funcion formato mensaje
const formatoMsg = require('./public/utils/messages.js');
//funciones acciones de los usuarios
const { userJoin, getCurrentUser, userLeave, getRoomUsers, getUserTypingStatus, setUserTypingStatus } = require('./public/utils/users.js');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Public carpeta estática
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'Whatsapp Bot';
const users = {};

//Cuando el cliente se conecte:
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    //Bienvenida cuando entra el actual
    socket.emit('message', formatoMsg(botName, 'Bienvenid@ a Whatsapp 2!'));

    // A todos se les manda el mensaje "---se unio al chat"
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatoMsg(botName, `${user.username} se unió al chat`)
      );

    // Informacion para los usuarios sobre la sala
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Cuando un usuario inicia un chat privado
  socket.on('privateChat', userId => {
    // Obtener el usuario seleccionado
    const selectedUser = userId
    if (selectedUser) {
      // Obtener al usuario actual
      const user = getCurrentUser(socket.id);
  
      // Cambiar la sala del usuario actual a la sala privada
      const roomId = `private_chat_${selectedUser.id}`;
      socket.leave(user.room);
      socket.join(roomId);
  
      // Enviar mensaje a la sala privada
      io.to(roomId).emit(
        'message',
        formatoMsg(botName, `${user.username} se unió al chat`)
      );
  
      // Actualizar la lista de usuarios en la sala privada
      io.to(roomId).emit('roomUsers', {
        room: roomId,
        users: getRoomUsers(roomId)
      });
  
      // Mostrar el botón para volver a la sala pública
      io.to(roomId).emit('showBackToPublicButton', true);
    }
  });   

  socket.on('backToPublic', () => {
    const user = getCurrentUser(socket.id);
    // Cambiar la sala del usuario actual a la sala pública
    socket.leave(user.room);
    socket.join(user.room); // temporalmente, hasta que el usuario seleccione otra sala
    user.room = "public_chat";
    io.to(user.room).emit('showBackToPublicButton', false);
  });

  // Escucha si hay mensajes
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    if (user) {
      // si la sala es privada
      if (user.room.includes("private_chat")) {
        // envia el mensaje a la sala privada
        io.to(user.room).emit('message', formatoMsg(user.username, msg));
      }
      // si la sala es publica
      else {
        // envia el mensaje a la sala publica
        io.to(user.room).emit('message', formatoMsg(user.username, msg));
      }
    }
  });

  socket.on("profilePicture", (fileData) => {
    const base64Data = fileData.data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const filePath = `./public/uploads/ProfilePictures/${fileData.name}`;
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
    // muestra la imagen en el listado de usuarios conectados
      if(err) {
        console.log(err);
      } else {
        console.log(`Archivo ${fileData.name} enviado`);
        const user = getCurrentUser(socket.id);
        if (user) {
          io.to(user.room).emit('imagen', formatoMsg(user.username, `<img src="${filePath}" width="200" height="200">`));
        }
      }
    });
  });

  // Escucha si existe el archivo en la carpeta public y lo envia
  socket.on('file', (fileData) => {
    const base64Data = fileData.data.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const filePath = `./public/uploads/${fileData.name}`;
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`Archivo ${fileData.name} enviado`);
        const user = getCurrentUser(socket.id);
        if (user) {
          // si es una foto se muestra directamente
          if (fileData.type.includes("image")) {
            io.to(user.room).emit('imagen', formatoMsg(user.username, `<img src="${filePath}" width="200" height="200">`));
          }
          // si es un video se muestra directamente
          else if (fileData.type.includes("video")) {
            io.to(user.room).emit('imagen', formatoMsg(user.username, `<video src="${filePath}" width="200" height="200" controls></video>`));
          }
          // si la sala es privada
          if (user.room.includes("private_chat")) {
            // envia el mensaje a la sala privada
            io.to(user.room).emit('message', formatoMsg(user.username, fileData.name));
          }
          // si la sala es publica
          else {
            // envia el mensaje a la sala publica
            io.to(user.room).emit('message', formatoMsg(user.username, fileData.name));
          }
        }
      }
    });
  });

  // Cuando un usuario escribe:
  socket.on('typing', isTyping => {
    const user = getCurrentUser(socket.id);
    setUserTypingStatus(user.id, user.room, isTyping);

    const usersTyping = getRoomUsers(user.room)
      .filter(user => getUserTypingStatus(user.id, user.room))
      .map(user => user.username)
      .join(', ');

    io.to(user.room).emit('typingMessage', usersTyping ? `${usersTyping} está escribiendo...` : '');
  });


  // Cuando usuario abandona el chat:
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatoMsg(botName, `${user.username} ha abandonado el chat`)
      );

      // Informacion para los usuarios sobre la sala
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

//constante puerto server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Sever en el puerto: ${PORT}`));
