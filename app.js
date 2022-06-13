const model = require("./stateMachineModel");
const express = require('express');
const bodyParser = require('body-parser')
const smcat = require("state-machine-cat");
const http = require('http');
const { Server } = require("socket.io"); 
const app = express();
const server = http.createServer(app);
const io = new Server(server);

var SVG_String;
var direction = 'left-right';
var selectedElements = Array();
var elemIndex = {initial : 'a', final : 'a', regular : 'a', transition : 'a', nested : 'a'};
var stateNames=Array();
var transitionList=Array();
var mapping = null;
var knownCards= new Map([["carte état initial",{ name: 'initial', type: 'initial' }],["carte état final",{ name: 'final', type: 'final' }],["carte état test",{ name: 'ok', type: 'regular' }]]);
var activeCards= new Map([["slot1",""],["slot2",""],["slot3",""],
                          ["slot4",""],["slot5",""],["slot6",""],
                          ["slot7",""],["slot8",""],["slot9",""]]);

var diagJSON=//JSON used to render the svg
{
  "transitions": [
      {
        "from":"initial",
        "to":"ok",
        "label":"début",
        "event":"début"
      },
      {
        "from":"ok",
        "to":"final",
        "label":"fin",
        "event":"fin"
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
app.use("/jqueryLibs", express.static(__dirname + '/jqueryLibs'));

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

  socket.on('delete', (elem, type) => {
    deleteS(elem, type);
  });

  socket.on('rename', (elem, type) => {
    console.log(elem);
    renameS(elem, type);
  });

  socket.on('selected', (elem, link) => {//Store the selected element name and type and send the info from the JSON to the client
    selectedElements.push(elem.name);

    if(elem.type=='state'){
      let state = recursiveFindStateByName(diagJSON,elem.name);
      if(mapping){
        knownCards.set(mapping, state);
        mapping=null;
        let notif = {title: "Carte liée", text: "La carte a été liée à l'état " + elem.name, icon:"success", duration: 3000};
        sendNotification(notif);
      }
      console.log(state);
      socket.emit("infos",state);

    }else if(elem.type=='transition'){
      console.log(elem.name);
      for (var i = 0; i < diagJSON.transitions.length; i++){
        if(diagJSON.transitions[i].label.trim() == elem.name){
          console.log(diagJSON.transitions[i]);
          socket.emit("infos",diagJSON.transitions[i]);
        }
      }
    }
  });

  socket.on('deselected_name', (name) => {
    selectedElements.pop(name);
    //console.log(selectedElements);
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
  console.log("---------------Carte posée-----------------");
  console.log(req.body);
  console.log("-------------------------------------------");
  if (cardID && slot) {


    if(slot==1){
      if(cardID.includes("mapping")){
        res.send("carte reçue");
        if(knownCards.get(cardID)){//If already mapped
          console.log("Carte déjà mappée");
        }else{
          mapping = cardID;
          mapCard(cardID);
        }


      }
    }

    if(slot==2){//Carte pattern
      if(knownCards.has(cardID)){
        res.send("carte déjà connue");
      }else{
        if(cardID=='carte pattern composite'){
          addNestedState(cardID);
          res.send("état composite ajouté");
          let notif = {
            title: "Ajout d'un état composite",
            text: "Les cartes précédemment liées à des états intra-composite ont été détachées",
            duration: 5000
          }
          sendNotification(notif);
        }

      }
    }

    if(slot==4 || slot==6){//slots états
       if((knownCards.has(cardID) && cardID.includes("mapping") ) || cardID.includes("pattern")){
         res.send("état existant");
       }else {
        if(cardID.includes("initial")){
          addState(cardID, 'initial');
        }else if(cardID.includes("final")){
          addState(cardID, 'final');
        }else if(cardID.includes("état")){
          addState(cardID, 'regular');
        }
        res.send("carte posée sur slot état");
        let notif = {title: "Ajout d'un état", text: "L'état a été ajouté", duration: 3000};
        sendNotification(notif);
      }
    }

    if (slot==5) {//slot transition
      addTransition(cardID);
      console.log(diagJSON);
      res.send("la transition a été ajoutée");
      let notif = {
        title: "Ajout d'une transition",
        text: "La transition a été ajoutée",
        duration: 3000
      }
      sendNotification(notif);
    }

    if(slot==7 || slot==9){//slots spec état
      setStateAction(cardID,slot);
      if(cardID.includes('entry')){
        knownCards.set(cardID, 'entry');
      }else{
        knownCards.set(cardID, 'exit');
      }

      res.send("l'action a été ajoutée");
    }

    if(slot==8){//slot spec transition
      if(cardID=='carte garde'){
        setTransitionGuard(cardID,slot);
      }else if(cardID=='carte action'){
        setTransitionAction(cardID,slot);
      }
      res.send("l'action a été ajoutée");

    }

    activateCard(slot, cardID);


  }

});


/////////////////////////
//SERVER-SIDE FUNCTIONS//
/////////////////////////

// function recursiveFindStateByName(root, name){ //Ancienne version qui bug quand on ajoute des états en dehors du composite
//   for (var i = 0; i < root.states.length; i++){
//     if(root.states[i].name==name){
//       return root.states[i];
//     }else if(root.states[i].statemachine != null){
//       return recursiveFindStateByName(root.states[i].statemachine, name);
//     }
//   }
  
// }

function recursiveFindStateByName(root, name, deleting = false){
  for (var i = 0; i < root.states.length; i++){
    if(root.states[i].name==name){
      if (deleting){
        root.states.splice(i,1);
        return 0;
      }else{
        return root.states[i];
      }

    }
  }
  for (var i = 0; i < root.states.length; i++){
    if(root.states[i].statemachine != null){
      return recursiveFindStateByName(root.states[i].statemachine, name);
    }
  }
}

function recursiveFindStateByClass(root, className){
  for (var i = 0; i < root.states.length; i++){
    if(root.states[i].class==className){
      return root.states[i];
    }
  }
  for (var i = 0; i < root.states.length; i++){
    if(root.states[i].statemachine != null){
      return recursiveFindStateByClass(root.states[i].statemachine, className);
    }
  }
}

function activateElement(root, name, color, className, nested = false){//Colors the border of the active state and adds them the active class
  let elem = recursiveFindStateByName(root,name);
  if(nested){
    for (let i = 0; i < elem.statemachine.states.length; i++) {
      elem.statemachine.states[i].color = "dark"+color;
    }
  }
  elem.class = className;
  elem.color = color;
  

}

function deactivateElement(root, className){//Removes the previous colored border and class
  let elem = recursiveFindStateByClass(root, className);
  if(elem){
    if(elem.statemachine){
      for (let i = 0; i < elem.statemachine.states.length; i++) {
        elem.statemachine.states[i].color = "black";
      }
    }
    elem.class='';
    elem.color='black';
  }
}

function mapCard(cardID){//Links the mapping card with the state that will be selected
  if(diagJSON.states){//If there is at least one state to select
    let notif = {title: "Sélectionner un état", text: "Cliquer sur un état pour le lier à la carte", duration: 3000};
    sendNotification(notif, "true");
    io.sockets.emit('cardMapping', "état")
  }
}

function activateCard(slot, cardID){//Tells the client which card was laid and where
  activeCards.set('slot'+slot,knownCards.get(cardID));
  console.log("--------------activeCards---------------");
  console.log(activeCards);


  if(slot==4 || slot==6){
    let color = "blue";
    let nested = false;
    let slotString;
    let class_;
    if(cardID.includes("pattern")){
      if(cardID=="carte pattern composite"){
        color="green";
        nested = true;
      }
    }
    if(slot==4){
      slotString = 'slot4';
      class_ = 'activeState1';
    }else{
      slotString = 'slot6';
      class_ = 'activeState2';
    }
    deactivateElement(diagJSON,class_);
    if(!cardID.includes("état")){
      activateElement(diagJSON, activeCards.get(slotString).name, color, class_, nested);
    }
    renderSVG(diagJSON);
  }


  if(slot==5){
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
    renderSVG(diagJSON);
  }
  
}

function renderSVG(source, socket = io.sockets){
  try {
      SVG_String = smcat.render(source,{inputType: "json",outputType: "svg", direction: direction});
      socket.emit("svg",SVG_String);
  } catch (pError) {
      console.error(pError);
  }
}

function addNestedState(cardID){
  let nestedStateName="état composite " + elemIndex.nested.toString();
  let transitions = diagJSON.transitions;
  diagJSON.transitions = [];
  let newDiag = {
    "transitions": transitions,
    "states": [
        {
          "name": nestedStateName,
          "type": "regular",
          "statemachine": diagJSON,
          "class" : "nested"
        }
    ]
  };
  deactivateElement(diagJSON,'activeState1');
  deactivateElement(diagJSON,'activeState2');
  diagJSON = newDiag;
  knownCards.set(cardID,newDiag.states[0]);//Unlink all cards from existing states
  elemIndex.nested =((parseInt(elemIndex.nested,36)+1).toString(36)).replace(/0/g,'');//Incrementation of state name 
  renderSVG(diagJSON);
}

function addState(cardID, type){//Add a new state in the diagram
  let stateName;
  if(type=='initial'){
    stateName = "état i";  
  }else if(type=='final'){
    stateName = "état f";
  }else{
    stateName="état ";
  }
  stateName += elemIndex[type].toString();
  let obj = {
     name: stateName,
     type: type
  }
  stateNames.push(obj.name);
  knownCards.set(cardID, obj);
  console.log(knownCards);
  diagJSON["states"].push(obj);
  elemIndex[type] =((parseInt(elemIndex[type],36)+1).toString(36)).replace(/0/g,'');//Incrementation of state name 
  renderSVG(diagJSON);
}

function setStateAction(cardID, slot, name='action'){//condition entry exit et slot 4 ou 6
  let action;
  let action2;
  if(cardID=='carte entry'){
    action = [{
      type: 'entry',
      body: name
    }];
    action2 = {
      type: 'entry',
      body: name
    };
  }else{
    action = [{
      type: 'exit',
      body: name
    }];
    action2 = {
      type: 'exit',
      body: name
    };
  }

  let state; 

  if(slot==7 && activeCards.get('slot4')!=''){
    state = recursiveFindStateByName(diagJSON,activeCards.get('slot4').name); 
  }else if(slot==9 && activeCards.get('slot6')!=''){
    state = recursiveFindStateByName(diagJSON,activeCards.get('slot6').name); 
  }
  console.log(state)
  if(state && !state.statemachine){
    if(state.actions == undefined){
      state.actions= action;
    }else if(state.actions.length == 1){
      state.actions.push(action2);
    }  
  }//If not nested


  renderSVG(diagJSON);
}

function addTransition(cardID){
  let obj;
  let from;
  let to;
  let valid = false;

  let transitionName;
  switch (cardID) {
    case 'transition gauche-droite':
      if(activeCards.get('slot4')!='' && activeCards.get('slot6')!=''){
        from = activeCards.get('slot4').name;
        to = activeCards.get('slot6').name;
        valid = true;
      }
      break;
    case 'transition droite-gauche':
      if(activeCards.get('slot4')!='' && activeCards.get('slot6')!=''){
        from = activeCards.get('slot6').name;
        to = activeCards.get('slot4').name;
        valid = true;
      }
      break;
    case 'transition gauche-gauche':
      if(activeCards.get('slot4')!=''){
        from = activeCards.get('slot4').name;
        to = activeCards.get('slot4').name;
        valid = true;
      }
      break;
    case 'transition droite-droite':
      if(activeCards.get('slot6')!=''){
        from = activeCards.get('slot6').name;
        to = activeCards.get('slot6').name;
        valid = true;
      }
      break;
  }
  transitionName = from+"->"+to;
  if(!transitionList.includes(transitionName) && valid){
    obj = {
      from: from,
      to: to,
      label: "transition " + elemIndex.transition,
      event: "transition " + elemIndex.transition
    }
    transitionList.push(transitionName);
    knownCards.set(cardID, obj);
    diagJSON["transitions"].push(obj); 
    elemIndex.transition =((parseInt(elemIndex.transition,36)+1).toString(36)).replace(/0/g,''); 
    renderSVG(diagJSON);
  }
}


function setTransitionGuard(cardID, slot, name = 'condition'){//condition entry exit et slot 4 ou 6
  if(slot==8 && activeCards.get('slot5')!=''){
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].label==activeCards.get('slot5').label){
        diagJSON.transitions[i].cond=name;

        if(diagJSON.transitions[i].action){
          diagJSON.transitions[i].label=diagJSON.transitions[i].event +' ['+ diagJSON.transitions[i].cond +'] \\'+ diagJSON.transitions[i].action;
        }else{
          diagJSON.transitions[i].label=diagJSON.transitions[i].event +' ['+ diagJSON.transitions[i].cond +'] ';
        }
        console.log(diagJSON)
        renderSVG(diagJSON);
      }
    }
  }
}

function setTransitionAction(cardID, slot, name = 'action'){//condition entry exit et slot 4 ou 6
  if(slot==8 && activeCards.get('slot5')!=''){
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].label==activeCards.get('slot5').label){
        diagJSON.transitions[i].action=name;

        if(diagJSON.transitions[i].cond){
          diagJSON.transitions[i].label=diagJSON.transitions[i].event +' ['+ diagJSON.transitions[i].cond +'] \\'+ diagJSON.transitions[i].action;
        }else{
          diagJSON.transitions[i].label=diagJSON.transitions[i].event +' \\'+ diagJSON.transitions[i].action +' ';
        }
        console.log(diagJSON)
        renderSVG(diagJSON);
      }
    }
  }
}

function deleteS(elem,type){
  
  if(type=="state"){
    console.log(elem.name);
    recursiveFindStateByName(diagJSON, elem.name, true);
    const indexes = [];
    for (var i = 0; i < diagJSON.transitions.length; i++){//Delete transitions associated with the state
      console.log('zouiw');
      if(diagJSON.transitions[i].from==elem.name){
        indexes.push(i);
      }
      if(diagJSON.transitions[i] && diagJSON.transitions[i].to==elem.name){
        indexes.push(i);
      }
    } 
    for (var i = indexes.length - 1; i >= 0; i--) {
      diagJSON.transitions.splice(i,1);
    }
    knownCards.forEach((value, key) => {
      if(key.includes('mapping') && value.name==elem.name){
        knownCards.delete(key);
      }
    });
    console.log(knownCards)

  }else if(type=="transition"){
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].label==elem.label){
        diagJSON.transitions.splice(i,1);
      }
    } 
    console.log(elem);
  }
  console.log("AAAAAAAAAAAAAAAH");
  console.log(diagJSON)
  renderSVG(diagJSON);
}

function renameS(elem, type){
  if(type=="state"){
    if(!stateNames.includes(elem.newName)){//If the newName does not already exist
      //console.log(elem)
      let state = recursiveFindStateByName(diagJSON, elem.oldName);
      if(elem.newName){
        state.name = elem.newName;
        for (var i = 0; i < diagJSON.transitions.length; i++){
          if(diagJSON.transitions[i].from==elem.oldName){
            diagJSON.transitions[i].from=elem.newName;
          }
          if(diagJSON.transitions[i].to==elem.oldName){
            diagJSON.transitions[i].to=elem.newName;
          }
        }
      }
      if(elem.action1){
        state.actions[0].body=elem.action1;
      }
      if(elem.action2){
        state.actions[1].body=elem.action2;
      }
      
      console.log(diagJSON)
    }
  }else if(type=="transition"){
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].event==elem.oldName){
        buildTransitionLabel(diagJSON.transitions[i], elem.newName);
        //console.log(diagJSON);
      }
    }
    //console.log(names);
  }
  renderSVG(diagJSON);
}

function buildTransitionLabel(transition, name){
  transition.event = name;
  transition.label = transition.event;
  if(transition.cond){
    transition.label += ' ['+transition.cond+'] ';
    if(transition.action){
      transition.label +=' \\' + transition.action;
    }
  }else if(transition.action){
    transition.label +=' \\'+transition.action;
  }
}

function sendNotification(notif, addendum = null){
  io.sockets.emit("notification",notif, addendum);
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});


