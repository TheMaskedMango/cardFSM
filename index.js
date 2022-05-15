const express = require('express');
const bodyParser = require('body-parser')
const fs = require('fs');
const smcat = require("state-machine-cat");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var direction;
var selectedElements = Array();
var diagJSON={//JSON used to render the svg
  "states": [
    { 
      "name": "initial",
      "type": "initial",
    },
    { 
      "name": "test",
      "type": "regular",
    },
  ],
  "transitions": [

  ]
};
app.use(bodyParser.urlencoded({ extended: false }))

///////////////////////
//INCLUDE LOCAL FILES//
///////////////////////
app.use(express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/css'));
app.use("/script", express.static(__dirname + '/script'));
app.use("/images", express.static(__dirname + '/images'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

var sock;
/////////////////////////////
//LISTEN FOR CLIENT ACTIONS//
/////////////////////////////
io.on('connection', (socket) => {
  console.log('a user connected');
  renderSVG(diagJSON, socket);

  socket.on('direction', (dir) => {
    console.log('direction: ' + dir);
    direction = dir;
    renderSVG(diagJSON, socket);
  });

  socket.on('rename', (rename) => {
    console.log('name to change: ' + rename[0]+" with: "+ rename[1]);
    renameS(rename);
  });

  socket.on('selected_name', (name) => {
    selectedElements.push(name);
    console.log(selectedElements);
  });

  socket.on('deselected_name', (name) => {
    selectedElements.pop(name);
    console.log(selectedElements);
  });

  socket.on('deselected_all', () => {
    selectedElements = [];
  });


});

///////////////////////////////
//LISTEN FOR PHYSICAL ACTIONS//
///////////////////////////////
app.post('/etat', (req, res) => {//Ajout d'état
  const { name, type } = req.body;

  if (name && type) {
    addState(name, type);
    console.log(diagJSON);
    res.send("l'état a été ajouté");
  } else {
    res.status(400).send('Il faut donner le type et le nom'); 
  }
});

app.post('/transition', (req, res) => {//Ajout de transition
  const { from, to } = req.body;

  if (from && to) {
    addTransition(from, to);
    console.log(diagJSON);
    res.send("la transition a été ajoutée");
  } else {
    res.status(400).send("La transition n'est pas valide"); 
  }
});

/////////////////////////
//SERVER-SIDE FUNCTIONS//
/////////////////////////
function renderSVG(source, socket = io.sockets){
  try {
      const lSVGInAString = smcat.render(source,{inputType: "json",outputType: "svg", direction: direction});
      socket.emit("svg",lSVGInAString);
  } catch (pError) {
      console.error(pError);
  }
}

function addState(name, type){
  let obj = {
     name: name,
     type: type
  }
  diagJSON["states"].push(obj); 
  renderSVG(diagJSON);
}

function addTransition(from, to){
  let obj = {
     from: from,
     to: to
  }
  diagJSON["transitions"].push(obj); 
  renderSVG(diagJSON);
}

function renameS(names){
  let oldName=names[0];
  let newName=names[1];
  console.log(JSON.stringify(diagJSON.length));
  for (var i=0; i<diagJSON.length; i++) {

    if (diagJSON[states][i].name == oldName) {
      diagJSON[states][i].name = newName;
    }
  }
  renderSVG(diagJSON);
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});