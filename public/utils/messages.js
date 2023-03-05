const moment = require('moment');

//funcion del formato del mensaje del usuario
function formatoMsg(username, text) {
  return {
    username,
    text,
    time: moment().format('h:mm a')
  };
}
//exportada
module.exports = formatoMsg;
