
var socket = io();
var direction = "top-bottom";//demande au serv bouffon
var selectedType;


socket.on('svg', (svg) => {//Listening on socket
    renderSVG(socket,svg);
});

function renderSVG(socket, svgString){//Parse the svg then displays it
    parser = new DOMParser();
    xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
    displaySVG(xmlDoc);
    linkSVG();
}

function displaySVG(xmlDoc){
    console.log(xmlDoc.childNodes[3]);
    //const content = xmlDoc.activeElement.innerHTML;
    //$("#svgDiagram").html(content);
    let div = document.getElementById("svgContainer");
    div.replaceChild(xmlDoc.childNodes[3], div.firstChild);
}

$(document).ready(function(){
    //linkSVG();
 });

 function linkSVG(){
    //Wait until the svg loads
    var checkExist = setInterval(function() {
       if ($('svg').length) {
          console.log("Images chargées");
          clearInterval(checkExist);
   
          svgRoot = $('svg');
          
          //$(svgRoot[1]).css("display","none");//Hiding vertical diagram by default
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
   
   
   
       }else{
           console.log("Chargement du diagramme..")
       }
    }, 100);
   //the svg doc is loaded asynchronouslys
   }

function resetSelected(){//Remove any selected element state
    deselect();
    $(".state, .transition",svgRoot).removeClass("selected");
    $(".state, .transition",svgRoot).children("path").attr("stroke","black");
    $(".state, .transition",svgRoot).children("polygon").attr("fill","black");
    $(".transition",svgRoot).children("polygon").attr("stroke","black");
}   

function toggleSelectedState(elem, color) {
    //console.log(elem);
    if(elem.parent().hasClass("selected")){
        console.log("déselectionné");
        $("#rename").css("display","none");
        elem.parent().children("path").attr("stroke","black");
        elem.parent().removeClass("selected");
        deselect(elem);
    }else{
        console.log("selectionné");
        resetSelected();
        $("#rename").css("display","");
        colorState(elem);
        elem.parent().addClass("selected");
        select(elem,"state");
    }
}

function toggleSelectedTransition(elem, states) {
    if(elem.parent().hasClass("selected")){//If already selected
        elem.parent().children("path").attr("stroke","black");
        elem.parent().children("polygon").attr("fill","black");
        elem.parent().children("polygon").attr("stroke","black");
        elem.parent().removeClass("selected");
    }else{
        resetSelected();
        $("#rename").css("display","");
        colorTransition(elem);
        elem.parent().addClass("selected");
        select(elem,"transition");
    }
}

function colorState(elem,color="blue"){
    elem.parent().children("path").attr("stroke",color);
}

function colorTransition(elem,color="red"){
    elem.parent().children("path").attr("stroke","red");
    elem.parent().children("polygon").attr("fill","red");
    elem.parent().children("polygon").attr("stroke","red");
}

////////////////////////
//SERVER COMMUNICATING//
////////////////////////

//Send the selected name to the server which saves it in an array
function select(elem, type){
    let name = elem.parent().children("title").html();
    socket.emit('selected_name',name);
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

function rename(){//Condition sur l'élément selectionné
    console.log($(".selected"));
    let oldName;
    let newName;
    if(selectedType=="state"){
        oldName = $(".selected").children("title").html()
        newName = prompt("Nouveau nom de l'état",oldName);
        if(oldName!=newName && newName!==null){
            let rename = Array();
            rename[0]=oldName;
            rename[1]=newName;
            socket.emit('rename',rename, "state");
            linkSVG();
        }else{
            resetSelected();
        }
    }else if(selectedType=="transition"){
        oldName = $(".selected").children("text").html();
        newName = prompt("Nouveau nom de la transition",oldName.replace(/&nbsp;/g, ''));
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