const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const fileInput = document.getElementById('fileInput');

// Conseguir el usuario mediante la URL
const { username, room, userImage } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// Sala a la que se une
socket.emit('joinRoom', { username, room });

// Obtener usuario y sala
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

socket.on('typingMessage', message => {
  document.getElementById('typing').innerText = message;
});

// botón de volver a sala pública (en sala privada)
socket.on('showBackToPublicButton', show => {
  document.getElementById('backToPublic').style.display = show ? 'block' : 'none';
});

// Mensaje del servidor cuando está esibiendo, durante 5 segundos
const input = document.getElementById('msg');

input.addEventListener('input', () => {
  socket.emit('typing', input.value.length > 0);
  setTimeout(() => {
    socket.emit('typing', false);
  }, 5000);
});

socket.on('userImagen', (userImage) => {
  // muestra la imagen en "users"
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = userImage.username;
  p.innerHTML += `<span>${userImage.time}</span>`;
  div.appendChild(p);
  // No funciona!!!!!!!!!!!!!!!!!!!!!!!!
  const img = document.createElement('img');
  img.src = './public/uploads/' + userImage.name;
  img.width = 100;
  img.height = 100;
  div.appendChild(img);
  document.querySelector('#users').appendChild(div);
});

socket.on("file", (fileData) => {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = fileData.username;
  p.innerHTML += `<span>${fileData.time}</span>`;
  div.appendChild(p);
    // No funciona!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  const a = document.createElement('a');
  a.href = './public/uploads/' + fileData.name;
  a.innerText = fileData.name;
  div.appendChild(a);
  document.querySelector('.chat-messages').appendChild(div);
});

socket.on('imagen', (fileData) => {
  // muestra la imagen en el chat
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = fileData.username;
  p.innerHTML += `<span>${fileData.time}</span>`;
  div.appendChild(p);
  // No funciona!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  const img = document.createElement('img');
  img.src = './public/uploads/' + fileData.name;
  img.width = 100;
  img.height = 100;
  div.appendChild(img);
  document.querySelector('.chat-messages').appendChild(div);
});

// Mensaje al server
socket.on('message', (message) => {
  outputMessage(message);

  // Scroll para ver todos los mensajes
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Submit del mensaje
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  // si hay un archivo adjunto
  if(fileInput.files.length > 0){
    const file = fileInput.files[0];
    console.log(file.type)
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const fileData  = {
        name: file.name,
        type: file.type,
        data: reader.result
      };
      socket.emit('file', fileData);
    };
  }
  // oculta el div typing durante 3 segundos
  socket.emit('typing', false);
  setTimeout(() => {
    socket.emit('typing', false);
  }, 3000);

  // Conseguir el contenido del mensaje
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Mandar mensaje al server/chat
  socket.emit('chatMessage', msg);

  // Limpiar el formulario input del mensaje
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

// Maquetacion de salida del mensaje
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement('p');
  para.classList.add('text');
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);
}

// Añadir el nombre de la habitación maquetada con DOM 
function outputRoomName(room) {
  roomName.innerText = room;
}

// Al pulsar en el botón, vuelve a la sala pública donde estaba
function backToRoom() {
  socket.emit('backToPublic');
}

// Maquetar los usuarios que se unen con DOM
function outputUsers(users, image) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    li.className = 'userOnList';
    li.id = user.username;
    userList.appendChild(li);
  });
}

// iniciar chat privado al pulsar sobre el nombre de cada usuario
document.getElementById('users').addEventListener('click', (e) => {
  const userId = e.target.id;
  if (userId) {
    socket.emit('privateChat', userId);
  }
});


//Mensaje ALERT cuando el usuario se va del chat con DOM
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('¿Estas seguro de que te quieres ir?');
  if (leaveRoom) {
    window.location = '../index.html';
  } else {
  }
});
