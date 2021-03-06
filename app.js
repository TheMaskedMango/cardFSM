const express = require('express');
const bodyParser = require('body-parser')
const smcat = require("state-machine-cat");
const http = require('http');
const { Server } = require("socket.io"); 
const app = express();
const server = http.createServer(app);
const io = new Server(server);

var SVG_String; //Contains the content of the rendered svg in string format
var direction = 'left-right';//Stores the diagram's orientation 
var elemIndex = {initial : 'a', final : 'a', regular : 'a', transition : 'a', nested : 'a'};//Used to create elements name (état A; état B..)
var stateNames=Array();
var mapping = null;
var knownCards= new Map();
var activeCards= new Map([["slot1",""],["slot2",""],["slot3",""],
                          ["slot4",""],["slot5",""],["slot6",""],
                          ["slot7",""],["slot8",""],["slot9",""]]);
var saveState;
var diagJSON=//JSON used to render the svg
{
  "transitions": [
      {
        "from":"Bouton relâché",
        "to":"Bouton pressé",
        "label":"Appuyer",
        "event":"Appuyer"
      },
      {
        "from":"Bouton pressé",
        "to":"Bouton relâché",
        "label":"Relâcher",
        "event":"Relâcher"
      }
  ],
  "states": [
      {
        "name": "Bouton relâché",
        "type": "regular"
      },
      {
        "name": "Bouton pressé",
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
io.on('connection', (socket) => {//When client connects
  const sock = socket;
  console.log('a user connected');
  renderSVG(diagJSON, socket);

  socket.on('direction', () => {//When rotate button clicked
    direction = direction =='left-right' ? 'top-bottom' : 'left-right';
    renderSVG(diagJSON, socket);
  });

  socket.on('delete', (elem, type) => {//When delete button clicked
    deleteS(elem, type);
  });

  socket.on('rename', (elem, type) => {//When an element is edited
    renameS(elem, type);
  });

  socket.on('selected', (elem, link) => {//When an element is clicked, stores its name and type and sends the info from the JSON to the client
    sendInfo(elem, sock);
  });

  socket.on('unlink', (card)=>{//When mapping card needs to be unlinked
    unlink(card);
  });


});

///////////////////////////////
//LISTEN FOR PHYSICAL ACTIONS//
///////////////////////////////

app.post('/card', (req, res) => {//Card is laid
  const {slot, cardID} = req.body;
  console.log("---------------Carte posée-----------------");
  console.log(req.body);
  console.log("-------------------------------------------");
  if (cardID && slot) {


    if(slot==1){//Slot info
      if(cardID.includes("mapping")){
        res.send("carte reçue");
        if(knownCards.get(cardID)){//If already mapped, need info about the mapped state
          io.sockets.emit('cardMapping', cardID, knownCards.get(cardID).name);
        }else{
          mapping = cardID;
          mapCard(cardID);
        }


      }
    }

    if(slot==2){//Slot pattern
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
        }else if(cardID=='carte pattern enregistrable'){
          saveDiagProgress();
          res.send("diagramme actuel enregistré");
          let notif = {
            title: "Enregistrement",
            text: "L'état actuel du diagramme a été associé à la carte",
            duration: 5000
          }
          sendNotification(notif);
        }

      }
    }

    if(slot==4 || slot==6){//slots états
       if((knownCards.has(cardID) && cardID.includes("mapping") )){
        res.send("état existant");
       }else {
        let notif; 
        notif = {title: "Ajout d'un état", text: "L'état a été ajouté'", duration: 3000};
        if(cardID.includes("initial")){
          addState(cardID, 'initial');
        }else if(cardID.includes("final")){
          addState(cardID, 'final');
        }else if(cardID.includes("état")){
          addState(cardID, 'regular');
        }else if(cardID.includes("enregistrable")){
          if(saveState){
            addPattern(cardID);
            notif = {title: "Ajout d'un pattern", text: "Le pattern a été ajouté", duration: 3000};
          }
        }
        res.send("carte posée sur slot état");
        
        sendNotification(notif);
      }
    }

    if (slot==5) {//slot transition
      checkExistingTransition(cardID);
      const added = addTransition(cardID);
      res.send("Carte posée sur slot transition");
      if(added){
        let notif = {
          title: "Ajout d'une transition",
          text: "La transition a été ajoutée",
          duration: 3000
        }
        sendNotification(notif);
      }
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
        knownCards.set(cardID, 'garde');
      }else if(cardID=='carte action'){
        setTransitionAction(cardID,slot);
        knownCards.set(cardID, 'action');
      }
      res.send("l'action a été ajoutée");

    }

    activateCard(slot, cardID);


  }

});


/////////////////////////
//SERVER-SIDE FUNCTIONS//
/////////////////////////

//Find a transition in the JSON of diagram by its name
function findTransitionByName(name){
  for (var i = 0; i < diagJSON.transitions.length; i++){
    if(diagJSON.transitions[i].event==name){
      return diagJSON.transitions[i];
    }
  }
}
//Find a state recursively (search through compound states) by its name
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

//Return the names of all states in the diagram
function recursiveGetStateNames(root){
  let stateNames = Array();
  for (var i = 0; i < root.states.length; i++){
    stateNames.push(root.states[i].name);
    if(root.states[i].statemachine != null){
      stateNames.push(...recursiveGetStateNames(root.states[i].statemachine));
    }
  }
  return stateNames;
}

//Find a state recursively (search through compound states) by its class
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

//Colors the border of the active state and adds them the active class
function activateElement(root, name, color, className, nested = false){
  let elem = recursiveFindStateByName(root,name);
  if(nested){
    for (let i = 0; i < elem.statemachine.states.length; i++) {
      elem.statemachine.states[i].color = "dark"+color;
    }
  }
  elem.class = className;
  elem.color = color;
  

}

//Removes the previous colored border and class
function deactivateElement(root, className){
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

//Links the mapping card with the state that will be selected
function mapCard(cardID){
  if(diagJSON.states){//If there is at least one state to select
    let notif = {title: "Sélectionner un état", text: "Cliquer sur un état pour le lier à la carte", duration: 3000};
    sendNotification(notif, "true");
    io.sockets.emit('cardMapping')
  }
}

//Tells the client which card was laid and where
function activateCard(slot, cardID){
  activeCards.set('slot'+slot,knownCards.get(cardID));
  console.log("--------------activeCards---------------");
  console.log(activeCards);
  console.log("----------------------------------------");

  if(slot==4 || slot==6){
    let color = "blue";
    let nested = false;
    let slotString;
    let class_;
    if(slot==4){
      slotString = 'slot4';
      class_ = 'activeState1';
    }else{
      slotString = 'slot6';
      class_ = 'activeState2';
    }
    console.log(activeCards.get(slotString));
    if(activeCards.get(slotString).statemachine){
      color="green";
      nested = true;
    }
    deactivateElement(diagJSON,class_);
    if(!cardID.includes("état") && !cardID.includes("pattern")){
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

function saveDiagProgress(){
  saveState = JSON.parse(JSON.stringify(diagJSON));//Used to clone the diagram
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
  //deactivateElement(diagJSON,'activeState1');
  //deactivateElement(diagJSON,'activeState2');
  diagJSON = newDiag;
  knownCards.set(cardID,newDiag.states[0]);//Unlink all cards from existing states
  elemIndex.nested =((parseInt(elemIndex.nested,36)+1).toString(36)).replace(/0/g,'');//Incrementation of state name 
  renderSVG(diagJSON);
}


function recursiveAvoidSameNames(root,names, firstRoot){
  for (var i = 0; i < root.states.length; i++){
    if(root.states[i].statemachine != null){
      recursiveAvoidSameNames(root.states[i].statemachine,names, firstRoot);
    }
    if(names.includes(root.states[i].name)){
      // let name = root.states[i].name;
      // if(root.states[i].name.match(/\(.*\)/g)){
      //   root.states[i].name += ' (2)';
      //   root.states[i].name.replace(/\(.*\)/g,'dazdadad');
      // }else{
        root.states[i].name += ' (1)';
      // }
      // for (var i = 0; i < firstRoot.transitions.length; i++){
      //   if(firstRoot.transitions[i].from==oldName){
      //     firstRoot.transitions[i].from=newName;
      //   }
      //   if(firstRoot.transitions[i].to==oldName){
      //     firstRoot.transitions[i].to=newName;
      //   }
      // }
    }
  }
}

function addPattern(cardID){
  let diagNames = recursiveGetStateNames(diagJSON);
  recursiveAvoidSameNames(saveState, diagNames, saveState);
  diagJSON.states.push(...saveState.states);
  saveState = JSON.parse(JSON.stringify(saveState));

  //diagJSON.transitions.push(...saveState.transitions);

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
  if(state && !state.statemachine){
    if(state.actions == undefined){
      state.actions= action;
    }else if(state.actions.length == 1){
      state.actions.push(action2);
    }  
  }//If not nested


  renderSVG(diagJSON);
}

function checkExistingTransition(from,to){
  for (var i = 0; i < diagJSON.transitions.length; i++){
    if(diagJSON.transitions[i].from==from){
      if(diagJSON.transitions[i].to==to){
        return diagJSON.transitions[i];
      }
    }
  }
  return false;
}

function addTransition(cardID){
  let obj;
  let from;
  let to;
  let valid = false;
  let exists;

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

  exists = checkExistingTransition(from,to);
  if(exists){
    knownCards.set(cardID, exists);
  }else{
    valid = true;
  }
  if(valid){
    obj = {
      from: from,
      to: to,
      label: "transition " + elemIndex.transition,
      event: "transition " + elemIndex.transition
    }
    knownCards.set(cardID, obj);
    console.log("---------------knownCards-----------------");
    console.log(knownCards);
    console.log("------------------------------------------");
    diagJSON["transitions"].push(obj); 
    elemIndex.transition =((parseInt(elemIndex.transition,36)+1).toString(36)).replace(/0/g,''); 
    
  }
  renderSVG(diagJSON);
  return valid;
}

function setTransitionGuard(cardID, slot, cond = 'condition'){//condition entry exit et slot 4 ou 6
  if(slot==8 && activeCards.get('slot5')!=''){
    let transition = findTransitionByName(activeCards.get('slot5').event);
    createTransitionCondition(transition,cond);
    renderSVG(diagJSON);
  }
}

function setTransitionAction(cardID, slot, action = 'action'){//condition entry exit et slot 4 ou 6
  if(slot==8 && activeCards.get('slot5')!=''){
    let transition = findTransitionByName(activeCards.get('slot5').event);
    createTransitionAction(transition,action);
    renderSVG(diagJSON);
  }
}

function deleteAssociatedTransitions(stateName){
  let indexes = [];
  for (var i = 0; i < diagJSON.transitions.length; i++){
    if(diagJSON.transitions[i].from==stateName){
      indexes.push(i);
    }
    if(diagJSON.transitions[i] && diagJSON.transitions[i].to==stateName){
      indexes.push(i);
    }
  } 
  for (var i = indexes.length - 1; i >= 0; i--) {
    diagJSON.transitions.splice(i,1);
}
}

function deleteS(elem,type){
  
  if(type=="state"){
    recursiveFindStateByName(diagJSON, elem.name, true);
    if(elem.statemachine){
      elem.statemachine.states.forEach((state) => {
        deleteAssociatedTransitions(state.name);
      });
    }
    deleteAssociatedTransitions(elem.name);
    knownCards.forEach((value, key) => {
      if(key.includes('mapping') && value.name==elem.name){
        knownCards.delete(key);
      }
    });

  }else if(type=="transition"){
    for (var i = 0; i < diagJSON.transitions.length; i++){
      if(diagJSON.transitions[i].label==elem.label){
        diagJSON.transitions.splice(i,1);
      }
    } 
  }
  renderSVG(diagJSON);
}

function renameS(elem, type){
  if(type=="state"){
    if(!stateNames.includes(elem.newName)){//If the newName does not already exist
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
    }
  }else if(type=="transition"){
    console.log("--------------elem-------------");
    console.log(elem);
    console.log("-------------------------------");
    let transition = findTransitionByName(elem.oldName);
    let name=elem.oldName;
    let cond = null;
    let action = null;
    if(elem.newName){
      name = elem.newName;
    }
    if(elem.cond){
      cond = elem.cond;
    }
    if(elem.action){
      action = elem.action;
    }

    buildTransitionLabel(transition, name, cond, action);

  }
  renderSVG(diagJSON);
}

function sendInfo(elem, sock){
  if(elem.type=='state'){
    let state = recursiveFindStateByName(diagJSON,elem.name);
    if(mapping){
      knownCards.set(mapping, state);
      mapping=null;
      let notif = {title: "Carte liée", text: "La carte a été liée à l'état " + elem.name, icon:"success", duration: 3000};
      sendNotification(notif);
    }
    sock.emit("infos",state);
  }else if(elem.type=='transition'){
    let transition = findTransitionByName(elem.name);
    sock.emit("infos",transition);

  }
}

function createTransitionCondition(transition, cond){
  transition.label = transition.event;
  transition.cond = cond;
  transition.label += ' ['+cond+'] ';
  if(transition.action){
    transition.label +=' \\' + transition.action;
  }
}

function createTransitionAction(transition, action){
  transition.label = transition.event;
  transition.action = action;
  if(transition.cond){
    transition.label += ' ['+transition.cond+'] ';
  }
  transition.label +=' \\' + action;
}

function buildTransitionLabel(transition, name, cond, action){//name, cond and action are texts to to change, if null keeping the actual one
  transition.event = name;
  transition.label = transition.event;
  if(transition.cond){
    if(!cond){
      cond = transition.cond;
    }
    transition.cond = cond;
    transition.label += ' ['+cond+'] ';
    if(transition.action){
      if(!action){
        action = transition.action;
      }
      transition.action=action;
      transition.label +=' \\' + action;
    }
  }else if(transition.action){
    if(!action){
      action = transition.action;
    }
    transition.action=action;
    transition.label +=' \\'+action;
  }
}

//Unlink the card parameter from the associated diagJSON state by deleting its entry in the knownCards map. 
//It also deactivates the state if so.
function unlink(card){
  if(recursiveFindStateByName(diagJSON,knownCards.get(card).name).class){
    knownCards.get(card).class = "";
    knownCards.get(card).color = "black";
    renderSVG(diagJSON);
  }
  knownCards.delete(card);
}

function sendNotification(notif, addendum = null){
  io.sockets.emit("notification",notif, addendum);
}

server.listen(3000, () => {
  console.log('listening on *:3000');
});


