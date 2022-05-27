
var socket = io();
var direction = "top-bottom";//demande au serv bouffon
var selectedType;
var slot=Array();
var dialog;
var selectedElem;

////////////////////
//SERVER RECEIVING//
////////////////////
socket.on('svg', (svg) => {//Listening on socket
    renderSVG(socket,svg);
});

socket.on('cardChange',(change)=> {
    console.log(change)
    slot[parseInt(change.slot,10)] = change.card;
    //markActivated();
});

socket.on('infos',(infos)=> {
    selectedElem=infos;
});

////////////////////
//CLIENT FUNCTIONS//
////////////////////
function renderSVG(socket, svgString){//Parse the svg then displays it
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
    displaySVG(xmlDoc);
    linkSVG();
}

function displaySVG(xmlDoc){//Insert the svg element in the HTML
    console.log(xmlDoc.childNodes[3]);
    let div = document.getElementById("svgContainer");
    div.replaceChild(xmlDoc.childNodes[3], div.firstChild);
}

$(document).ready(function(){
    //linkSVG();
 });

 function linkSVG(){//Processes the svg and add listeners on it
    //Wait until the svg loads
    var checkExist = setInterval(function() {
       if ($('svg').length) {
          clearInterval(checkExist);
   
          svgRoot = $('svg');
          
          $(svgRoot).attr('id', 'svgDiagram');
          $(svgRoot).attr('width', '90%');
          $(svgRoot).attr('height', '90%');
          $("#rename").css("display","none");
   
   
          //console.log($(".state",svgRoot));
          if($(".state",svgRoot).length) {
              $("#empty").css("display","none");
          }else{
              $("#empty").css("display","");
          }
   
          clearListeners();
          $(".state.regular polygon",svgRoot).click(function() {//Listeners states
              console.log($(this).parent().children("title").html());
              toggleSelectedState($(this),"blue");
          });
          
          
          $(".transition polygon",svgRoot).click(function() {//Listeners transitions
              stateArray = $(this).parent().children("title").html().split("-&gt;");
              console.log("source: "+stateArray[0]+"  destination: "+stateArray[1]);
              toggleSelectedTransition($(this),stateArray);
          });
          markActivated();

          console.log("Images chargées");
       }else{
           console.log("Chargement du diagramme..")
       }
    }, 100);
   //the svg doc is loaded asynchronouslys
   }

function resetSelected(){//Remove any selected element status
    deselect();
    $(".state, .transition",svgRoot).removeClass("selected");
    $(".state, .transition",svgRoot).children("text").attr("fill","black");
    //$(".state, .transition",svgRoot).children("polygon").attr("fill","black");
    //$(".transition",svgRoot).children("polygon").attr("stroke","black");
}   

function toggleSelectedState(elem, color) {
    //console.log(elem);
    if(elem.parent().hasClass("selected")){
        console.log("déselectionné");
        $("#rename").css("display","none");
        elem.parent().children("text").attr("fill","black");
        elem.parent().removeClass("selected");
        deselect(elem);
    }else{
        console.log("selectionné");
        resetSelected();
        $("#rename").css("display","");
        colorTextElement(elem);
        elem.parent().addClass("selected");
        select(elem,"state");
    }
}

function toggleSelectedTransition(elem, states) {
    if(elem.parent().hasClass("selected")){//If already selected
        colorTextElement(elem,"black");
        elem.parent().removeClass("selected");
        $("#rename").css("display","none");
        deselect(elem);
    }else{
        resetSelected();
        $("#rename").css("display","");
        colorTextElement(elem,"red");
        elem.parent().addClass("selected");
        select(elem,"transition");
    }
}

function colorTextElement(elem,color="blue"){
    elem.parent().children("text").attr("fill",color);
}




function markActivated(){//Add blink animation on elements activated by their card
    //$('.activeState1').children("text").attr('fill',"orange");
    $('.activeState1').append('<circle cx="100" cy="50" r="40" stroke="black" stroke-width="2" fill="red"/>');

}

////////////////////////
//SERVER COMMUNICATING//
////////////////////////

//Send the selected name to the server which saves it in an array
function select(elem, type){
    let name = elem.parent().children("text").html();
    if(type=='transition'){
        name = name.replace(/&nbsp;/g, '').trim();
    }
    let obj={
        name: name,
        type: type
    }
    socket.emit('selected',obj);
    selectedType = type;
}

//Send the name to deselect to the server which removes it from its array
function deselect(elem){
    if(elem==undefined){
        socket.emit('deselected_all');
    }else{
        let name = elem.parent().children("title").html();
        socket.emit('deselected_name',name);
    }
}


function editDialog(){
    let oldName;

    if(selectedType=="state"){
        oldName = $(".selected").children("title").html()
        if(selectedElem.actions==undefined){
            $('label[for=input2], input#input2').hide();
            $('label[for=input3], input#input3').hide();
        }else if (selectedElem.actions.length > 0) {
            console.log(selectedElem.actions[0].type);
            $('label[for=input2]').html(selectedElem.actions[0].type);
            $('#input2').val(selectedElem.actions[0].body)
            if (selectedElem.actions.length > 1) {
                $('label[for=input3]').html(selectedElem.actions[1].type);
                $('#input3').val(selectedElem.actions[1].body)
            }
        }

        
    
    }else if(selectedType=="transition"){
        oldName = selectedElem.event;
        console.log("YAHAAA")
    }


    $("#name").val(oldName);
    dialog= $( "#dialog" ).dialog({
        height: 400,
        width: 350,
        modal: true,
        buttons: {
          "Appliquer": rename,
          "Annuler": function() {
            dialog.dialog( "close" );
          }
        },
        close: function() {
            resetSelected();
        }
    });
    
}

function rename(){//Condition sur l'élément selectionné
    let oldName;
    let newName= $("#name").val();
    let newAction1= $("#input2").val();
    let newAction2= $("#input3").val();
    let obj = {
        name: '',
        action1 : '',
        action2 : ''
    }
    if(selectedType=="state"){
        oldName = $(".selected").children("title").html()
        if(oldName!=newName && newName!==null){//Changing state name
            let rename = Array();
            rename[0]=oldName;
            rename[1]=newName;
            socket.emit('rename',rename, "state");
            linkSVG();
        }
        if(newAction1!==null){

        }
    }else if(selectedType=="transition"){
        oldName = $(".selected").children("text").html().replace(/&nbsp;/g, '').replace(/\[.*\]/g, '').trim();
        if(oldName!=newName && newName!==null){
            let rename = Array();
            rename[0]=oldName;
            rename[1]=newName;
            socket.emit('rename',rename, "transition");
            linkSVG();
        }else{
            resetSelected();
        }
    }
    dialog.dialog( "close" );

}

function clearListeners(){//Remove the click listeners to free memory
    $(".state.regular polygon",svgRoot).off();//Remove previous listeners
    $(".transition polygon",svgRoot).off();
    console.log("listeners supprimés");
}

function changeDirection(){
    clearListeners();
    socket.emit('direction');
    linkSVG();
}