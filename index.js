const model = require("./stateMachineModel");
const express = require('express');
const bodyParser = require('body-parser')
const fs = require('fs');
const smcat = require("state-machine-cat");
const http = require('http');
const { Server } = require("socket.io"); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);


var direction = 'left-right';
var selectedElements = Array();
var stateNumber=1;
var stateNames=Array();//Faire plutôt une map avec nom : idCarte
var transitionNames=Array();
var diagJSON=//JSON used to render the svg
{
  "transitions": [
      {
          "from": "closed",
          "to": "syn_sent",
          "label": "Active open/ SYN",
          "event": "Active open",
          "action": "SYN"
      },
      {
          "from": "closed",
          "to": "listen",
          "label": "Passive open",
          "event": "Passive open"
      },
      {
          "from": "initial",
          "to": "closed"
      },
      {
          "from": "listen",
          "to": "closed",
          "label": "Close",
          "event": "Close"
      },
      {
          "from": "listen",
          "to": "syn_sent",
          "label": "Send/ SYN",
          "event": "Send",
          "action": "SYN"
      },
      {
          "from": "listen",
          "to": "syn_rcvd",
          "label": "SYN/ SYN + ACK",
          "event": "SYN",
          "action": "SYN + ACK"
      },
      {
          "from": "syn_sent",
          "to": "closed",
          "label": "Close",
          "event": "Close"
      },
      {
          "from": "syn_sent",
          "to": "syn_rcvd",
          "label": "SYN/ SYN + ACK",
          "event": "SYN",
          "action": "SYN + ACK"
      },
      {
          "from": "syn_sent",
          "to": "established",
          "label": "SYN + ACK/ ACK",
          "event": "SYN + ACK",
          "action": "ACK"
      },
      {
          "from": "syn_rcvd",
          "to": "established",
          "label": "ACK",
          "event": "ACK"
      },
      {
          "from": "syn_rcvd",
          "to": "fin_wait_1",
          "label": "Close/ FIN",
          "event": "Close",
          "action": "FIN"
      },
      {
          "from": "established",
          "to": "fin_wait_1",
          "label": "Close/ FIN",
          "event": "Close",
          "action": "FIN"
      },
      {
          "from": "established",
          "to": "close_wait",
          "label": "FIN/ ACK",
          "event": "FIN",
          "action": "ACK"
      },
      {
          "from": "fin_wait_1",
          "to": "fin_wait_2",
          "label": "ACK",
          "event": "ACK"
      },
      {
          "from": "fin_wait_1",
          "to": "closing",
          "label": "FIN/ ACK",
          "event": "FIN",
          "action": "ACK"
      },
      {
          "from": "fin_wait_2",
          "to": "time_wait",
          "label": "FIN/ ACK",
          "event": "FIN",
          "action": "ACK"
      },
      {
          "from": "closing",
          "to": "time_wait",
          "label": "ACK",
          "event": "ACK"
      },
      {
          "from": "time_wait",
          "to": "closed",
          "label": "timeout after two segment lifetimes",
          "event": "timeout after two segment lifetimes"
      },
      {
          "from": "close_wait",
          "to": "last_ack",
          "label": "Close/ FIN",
          "event": "Close",
          "action": "FIN"
      },
      {
          "from": "last_ack",
          "to": "closed",
          "label": "ACK",
          "event": "ACK"
      }
  ],
  "states": [
      {
          "name": "closed",
          "type": "regular"
      },
      {
          "name": "syn_sent",
          "type": "regular"
      },
      {
          "name": "listen",
          "type": "regular"
      },
      {
          "name": "initial",
          "type": "initial"
      },
      {
          "name": "syn_rcvd",
          "type": "regular"
      },
      {
          "name": "established",
          "type": "regular"
      },
      {
          "name": "fin_wait_1",
          "type": "regular"
      },
      {
          "name": "close_wait",
          "type": "regular"
      },
      {
          "name": "fin_wait_2",
          "type": "regular"
      },
      {
          "name": "closing",
          "type": "regular"
      },
      {
          "name": "time_wait",
          "type": "regular"
      },
      {
          "name": "last_ack",
          "type": "regular"
      }
  ]
};

app.use(bodyParser.urlencoded({ extended: false }))

///////////////////////
//INCLUDE LOCAL FILES//
///////////////////////
app.use(express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/css'));
app.use("/client", express.static(__dirname + '/client'));
app.use("/images", express.static(__dirname + '/images'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client/index.html');
});

var sock;
/////////////////////////////
//LISTEN FOR CLIENT ACTIONS//
/////////////////////////////
io.on('connection', (socket) => {
  console.log('a user connected');
  renderSVG(diagJSON, socket);

  socket.on('direction', () => {
    direction = direction =='left-right' ? 'top-bottom' : 'left-right';
    renderSVG(diagJSON, socket);
  });

  socket.on('rename', (rename, type) => {
    //console.log('name to change: ' + rename[0]+" with: "+ rename[1]);
    renameS(rename, type);
    console.log(stateNames);
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
  //s = new model.State(name,type);
  //s.addToStateList();
  let obj = {
     name: stateNumber.toString(),
     type: type
  }
  stateNumber++;
  stateNames.push(obj.name);
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

function renameS(names, type){
  let oldName=names[0];
  let newName=names[1];
  if(type=="state"){
    if(!stateNames.includes(newName)){//If the newName doesnt already exist
      for (var i = 0; i < diagJSON.states.length; i++){
        if(diagJSON.states[i].name==oldName){
          diagJSON.states[i].name=newName;
        }
        stateNames.pop(oldName);
        stateNames.push(newName);
      }
      for (var i = 0; i < diagJSON.transitions.length; i++){
        if(diagJSON.transitions[i].from==oldName){
          diagJSON.transitions[i].from=newName;
        }
        if(diagJSON.transitions[i].to==oldName){
          diagJSON.transitions[i].to=newName;
        }
      }
      renderSVG(diagJSON);
    }
  }else if(type=="transition"){
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].event==oldName){
        diagJSON.transitions[i].event=newName;
        diagJSON.transitions[i].label=newName;
        console.log(diagJSON.transitions[i]);
      }
    }
    renderSVG(diagJSON);
  }
  
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});
