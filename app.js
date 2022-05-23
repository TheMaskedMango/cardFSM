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
var transitionNumber='a';
var transitionList=Array();

var knownCards= new Map([["carte état initial",{ name: 'initial', type: 'initial' }],["carte état final",{ name: 'final', type: 'final' }],["carte état test",{ name: 'ok', type: 'regular' }]]);
var activeCards= new Map([["slot1",""],["slot2",""],["slot3",""],
                          ["slot4",""],["slot5",""],["slot6",""],
                          ["slot7",""],["slot8",""],["slot9",""]]);

var proxy = new Proxy(activeCards,{
  set: function(){
    console.log(activeCards);
  }
});

var diagJSON=//JSON used to render the svg
{
  "transitions": [
      {
        "from":"initial",
        "to":"ok",
        "label":"test",
        "event":"test"
      }
  ],
  "states": [
      {
        "name": "initial",
        "type": "initial"
      },
      {
        "name": "final",
        "type": "final"
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

app.post('/card', (req, res) => {//Carte posée
  const {slot, cardID} = req.body;
  console.log(req.body);
  if (cardID && slot) {

    if(slot==4 || slot==6){//slots états
      if(knownCards.has(cardID)){
        res.send("l'état existe déjà");
      }else{
        addState(cardID, 'regular');
        res.send("l'état a été ajouté");
      }
    }

    if (slot==5) {//slot transition
      addTransition(cardID);
      console.log(diagJSON);
      res.send("la transition a été ajoutée");
    }

    if(slot==7 || slot==9){//slots spec état
      setStateAction(cardID,slot);
      res.send("l'action a été ajoutée");
    }

    if(slot==8){//slot spec transition
      setTransitionGuard(cardID,slot);
      res.send("l'action a été ajoutée");
      
    }

    activateCard(slot, cardID);

  }

});


/////////////////////////
//SERVER-SIDE FUNCTIONS//
/////////////////////////

function activateCard(slot, cardID){//Tells the client which card was laid and where
  activeCards.set('slot'+slot,knownCards.get(cardID));
  console.log(activeCards);
  if(slot==4){
    let text = ["État actif 1"]
    for (var i = 0; i < diagJSON.states.length; i++){
      if(diagJSON.states[i].class=='activeState1'){
        diagJSON.states[i].class = '';
        diagJSON.states[i].color = 'black';
      }
      if(diagJSON.states[i].name==activeCards.get('slot4').name){
        diagJSON.states[i].class = 'activeState1';
        diagJSON.states[i].color = 'purple';
      }
    }
  }
  if(slot==6){
    let text = ["État actif 2"]
    for (var i = 0; i < diagJSON.states.length; i++){
      if(diagJSON.states[i].class=='activeState2'){
        diagJSON.states[i].class = '';
        diagJSON.states[i].color = 'black';
      }
      if(diagJSON.states[i].name==activeCards.get('slot6').name){
        diagJSON.states[i].class = 'activeState2';
        diagJSON.states[i].color = 'orange';
      }
    }
  }

  if(slot==5){
    let text = ["Transition active"]
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].class=='activeTransition'){
        diagJSON.transitions[i].class = '';
        diagJSON.transitions[i].color = 'black';
      }
      if(diagJSON.transitions[i].label==activeCards.get('slot5').label){
        diagJSON.transitions[i].class = 'activeTransition';
        diagJSON.transitions[i].color = 'red';
      }
    }
  }
  renderSVG(diagJSON);
}

function renderSVG(source, socket = io.sockets){
  try {
      SVG_String = smcat.render(source,{inputType: "json",outputType: "svg", direction: direction});
      socket.emit("svg",SVG_String);
  } catch (pError) {
      console.error(pError);
  }
}

function addState(cardID, type){//Add a new state in the diagram
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

function setStateAction(cardID, slot, name='action'){//condition entry exit et slot 4 ou 6
  let action = [{
    type: 'entry',
    body: name
  }];
  if(slot==7 && activeCards.get('slot4')!=''){
    for (var i = 0; i < diagJSON.states.length; i++){
      if(diagJSON.states[i].name==activeCards.get('slot4').name){
        diagJSON.states[i].actions=action;
        console.log(diagJSON)
        renderSVG(diagJSON);
      }
    }
  }
  if(slot==9 && activeCards.get('slot6')!=''){
    for (var i = 0; i < diagJSON.states.length; i++){
      if(diagJSON.states[i].name==activeCards.get('slot6').name){
        diagJSON.states[i].actions=action;
        console.log(diagJSON)
        renderSVG(diagJSON);
      }
    }
  }
}

function addTransition(cardID){
  let obj;
  let from;
  let to;

  let transitionName;
  switch (cardID) {
    case 'transition gauche-droite':
      if(activeCards.get('slot4')!='' && activeCards.get('slot6')!=''){
        from = activeCards.get('slot4').name;
        to = activeCards.get('slot6').name;
      }
      break;
    case 'transition droite-gauche':
      if(activeCards.get('slot4')!='' && activeCards.get('slot6')!=''){
        from = activeCards.get('slot6').name;
        to = activeCards.get('slot4').name;
      }
      break;
    case 'transition gauche-gauche':
      if(activeCards.get('slot4')!=''){
        from = activeCards.get('slot4').name;
        to = activeCards.get('slot4').name;
      }
      break;
    case 'transition droite-droite':
      if(activeCards.get('slot6')!=''){
        from = activeCards.get('slot6').name;
        to = activeCards.get('slot6').name;
      }
      break;
  }
  transitionName = from+"->"+to;
  obj = {
     from: from,
     to: to,
     label: transitionNumber,
     event: transitionNumber
  }
  if(!transitionList.includes(transitionName)){
    transitionList.push(transitionName);
    knownCards.set(cardID, obj);
    diagJSON["transitions"].push(obj); 
    transitionNumber =((parseInt(transitionNumber,36)+1).toString(36)).replace(/0/g,''); 
    renderSVG(diagJSON);
  }
}


function setTransitionGuard(cardID, slot, name = 'condition'){//condition entry exit et slot 4 ou 6
  if(slot==8 && activeCards.get('slot5')!=''){
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].label==activeCards.get('slot5').label){
        diagJSON.transitions[i].cond=name;
        diagJSON.transitions[i].label=diagJSON.transitions[i].event +' ['+ diagJSON.transitions[i].cond +'] '
        if(diagJSON.transitions[i].action){
          diagJSON.transitions[i].label + diagJSON.transitions[i].action;
        }
        console.log(diagJSON)
        renderSVG(diagJSON);
      }
    }
  }
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
        console.log(diagJSON);
      }
    }
    console.log(names);
    renderSVG(diagJSON);
  }
  
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});

