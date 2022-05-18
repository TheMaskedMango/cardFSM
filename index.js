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

var SVG_String;
var direction = 'left-right';
var selectedElements = Array();
var stateNumber='a';
var stateNames=Array();//Faire plutôt une map avec nom : idCarte
var transitionNames=Array();

var knownCards= new Map([["carte état initial","initial"]]);

var diagJSON=//JSON used to render the svg
{
  "transitions": [
      {
          "from":"initial",
          "to":"ok"
      }
  ],
  "states": [
      {
          "name": "initial",
          "type": "initial"
      },
      {
          "name": "ok",
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

app.post('/etat1', (req, res) => {//Carte posée sur le slot état 1
  const { cardID} = req.body;
  console.log(req.body);
  if (cardID) {
    if(knownCards.has(cardID)){
      res.send("l'état existe déjà");
    }else{
      addState(cardID, 'regular');
      res.send("l'état a été ajouté");
    }
    blink(cardID);

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

function blink(cardID){
  //name = 
}

function renderSVG(source, socket = io.sockets){
  try {
      SVG_String = smcat.render(source,{inputType: "json",outputType: "svg", direction: direction});
      socket.emit("svg",SVG_String);
  } catch (pError) {
      console.error(pError);
  }
}

function addState(cardID, type){
  //s = new model.State(name,type);
  //s.addToStateList();
  let stateName="état " + stateNumber.toString();
  let obj = {
     name: stateName,
     type: type
  }
  stateNames.push(obj.name);
  knownCards.set(cardID, obj);
  console.log(knownCards);
  diagJSON["states"].push(obj);
  stateNumber =((parseInt(stateNumber,36)+1).toString(36)).replace(/0/g,'');//Incrementation of state name 
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
        for (let [key, value] of knownCards.entries()) {//If old name in the knownCards map, replace it by the new one
          if (value.name === oldName){
            value.name = newName;
          }
        }
      }
      console.log(knownCards);
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

