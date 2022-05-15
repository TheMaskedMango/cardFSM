
var socket = io();
var direction = "left-right";


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
   
          $(".state.regular polygon",svgRoot).off();//Remove previous listeners
          $(".state.regular polygon",svgRoot).click(function() {//Listeners states
              console.log($(this).parent().children("title").html());
              toggleSelectedState($(this),"blue");
          });
          
          $(".transition polygon",svgRoot).off();
          $(".transition polygon",svgRoot).click(function() {//Listeners transitions
              stateArray = $(this).parent().children("title").html().split("-&gt;");
              console.log("source: "+stateArray[0]+"  destination: "+stateArray[1]);
              toggleSelectedTransition($(this),stateArray);
          });
   
   
   
       }else{
           console.log("Chargement du diagramme..")
       }
    }, 100);
   //the svg doc is loaded asynchronously
   }

function resetSelected(){//Remove any selected element state
    deselect();
    $(".state, .transition",svgRoot).removeClass("selected");
    $(".state, .transition",svgRoot).children("path").attr("stroke","black");
    $(".state, .transition",svgRoot).children("polygon").attr("fill","black");
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
        elem.parent().children("path").attr("stroke",color);
        elem.parent().addClass("selected");
        select(elem);
    }
}

////////////////////////
//SERVER COMMUNICATING//
////////////////////////

//Send the selected name to the server which saves it in an array
function select(elem){
    let name = elem.parent().children("title").html();
    socket.emit('selected_name',name);
}

//Send the name to deselect to the server which removes it from its array
function deselect(elem){
    if(elem==undefined){
        socket.emit('deselected_all');
        console.log("siuuu");
    }else{
        let name = elem.parent().children("title").html();
        socket.emit('deselected_name',name);
    }

}

function rename(){
    let oldName = $(".selected").children("title").html()
    let newName = prompt("Nom de l'état",oldName);
    if(oldName!=newName && newName!==null){
        let rename = Array();
        rename[0]=oldName;
        rename[1]=newName;
        socket.emit('rename',rename);
    }
    linkSVG();
}

function changeDirection(){
    if(direction == "left-right"){
        direction="top-bottom";
    }else{
        direction = "left-right";
    }
    socket.emit('direction',direction );
    linkSVG();
}