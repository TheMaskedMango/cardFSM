const express = require('express');
const fs = require('fs');
const smcat = require("state-machine-cat");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var diagJSON={
  "states": [
    { 
    "name": "initial",
    "type": "initial",
    },
    { 
      "name": "skinny",
      "type": "regular",
    },
  ],
  "transitions": [

  ]
};


app.use(express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/css'));
app.use("/script", express.static(__dirname + '/script'));
app.use("/images", express.static(__dirname + '/images'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  renderFromJSON('left-right', socket);

  socket.on('direction', (dir) => {
    console.log('direction: ' + dir);
    renderFromJSON(dir, socket);
  });

  socket.on('rename', (rename) => {
    console.log('name to change: ' + rename[0]+" with: "+ rename[1]);
    renameS(rename, socket);
  });


});

server.listen(3000, () => {
  console.log('listening on *:3000');
});


function renderFromJSON(dir, socket){
    renderSVG(diagJSON, dir, socket);
}


function renderSVG(source, dir, socket){
  try {
      const lSVGInAString = smcat.render(source,{inputType: "json",outputType: "svg", direction: dir});
      socket.emit("svg",lSVGInAString);
  } catch (pError) {
      console.error(pError);
  }
}

function renameS(names, socket){
  
}
