var svgRoot;
var socket = io();
var direction = "top-bottom";
var selectedType;
var slot=Array();
var dialog;
var selectedElem;
var notif;
var greyed = false;
var mappingCard;

////////////////////
//SERVER RECEIVING//
////////////////////

socket.on('svg', (svg) => {//Listening on socket for SVG image
    renderSVG(socket,svg);//Actualizes the diagram with the new SVG
});

socket.on('notification', (notif) =>{
    notify(notif);//Creates a graphical toast notification on screen
})

socket.on('cardMapping',(card,stateName)=> {
    if(card){
        mappingCard = card;
        $("#detach").css("display","block");
        $("#close").css("display","block");
        resetSelected();
        highlightState(stateName);
    }else{
        resetSelected();
        greyTransitions();
    }
    $("#rotate").css("display","none");
});

socket.on('infos',(infos)=> {
    selectedElem=infos;//Get infos of the selected element (if it's a state, its name, type, class etc..)
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
    let div = document.getElementById("svgContainer");
    div.replaceChild(xmlDoc.childNodes[3], div.firstChild);
}

 function linkSVG(){//Processes the svg and add listeners on it
    //Wait until the svg loads because it is loaded asynchronously

    var checkExist = setInterval(function() {
       if ($('svg').length) {
            clearInterval(checkExist);

            svgRoot = $('svg');
            
            $(svgRoot).attr({
                id: 'svgDiagram',
                width:'70%',
                height:'70%',
            });

            //Default display options for buttons
            $("#rotate").css("display","block");
            $("#rename").css("display","none");
            $("#detach").css("display","none");
            $("#close").css("display","none");

            //Checks if diagram is empty
            if($(".state",svgRoot).length) {
                empty(false);
            }else{
                empty(true);
            }

            clearListeners();
            $(".state.regular polygon",svgRoot).click(function() {//Listeners states
                toggleStateColorAndClass($(this),"blue");
            });

            $(".state.initial ellipse, .state.final ellipse",svgRoot).click(function() {//Listeners states
                toggleStateColorAndClass($(this),"blue");
            });

            //Ajouter des listeners pour les états initial et final, sur le premier attribut ellipse

            $(".cluster text",svgRoot).click(function() {//Listeners nested (composite) states
                toggleStateColorAndClass($(this),"green");
            });
            
            $(".transition text",svgRoot).attr("fill","black");//Because of how the smcat render function color transition
            $(".transition polygon",svgRoot).click(function() {//Listeners transitions
                stateArray = $(this).parent().children("title").html().split("-&gt;");
                console.log("source: "+stateArray[0]+"  destination: "+stateArray[1]);
                toggleTransitionColorAndClass($(this),"red");
            });
            markActivated();
       }else{
       }
    }, 100);
}

function resetSelected(){//Remove any selected element status and set the colors and classes to default
    deselect();
    $("#rename").css("display","none");
    $(".state, .transition",svgRoot).removeClass("selected");
    $(".state, .transition",svgRoot).children("text").attr("fill","black");
    if(greyed){
        greyed=false;
        $(".transition",svgRoot).children("polygon").attr("fill","black");
        $(".transition",svgRoot).children("polygon").attr("stroke","black");
        $(".state, .transition",svgRoot).children("path").attr("stroke","black");
        $(".state",svgRoot).children("ellipse").attr("stroke","black");
        $(".initial ellipse, .final ellipse:nth-child(2)",svgRoot).attr("fill","black");
        $("#rotate").css("display","block");
    }

}   

function toggleStateColorAndClass(elem, color, class_ = 'selected') {//Select or deselect a state by changing its color and class
    if(elem.parent().hasClass(class_)){
        $("#rename").css("display","none");
        elem.parent().children("text").attr("fill","black");
        elem.parent().removeClass(class_);
        deselect(elem);
    }else{
        resetSelected();
        $("#rename").css("display","block");
        colorTextElement(elem.parent(), color);
        elem.parent().addClass(class_);
        select(elem,"state");
    }
}

function toggleTransitionColorAndClass(elem, color = "red", class_ = 'selected') {//Select or deselect a transition by changing its color and class
    if(elem.parent().hasClass(class_)){//If already selected
        colorTextElement(elem.parent(),"black");
        elem.parent().removeClass(class_);
        $("#rename").css("display","none");
        deselect(elem);

    }else{
        resetSelected();
        $("#rename").css("display","block");
        colorTextElement(elem.parent(),color);
        elem.parent().addClass(class_);
        select(elem,"transition");
    }
}

function colorTextElement(elem,color="blue"){//Color text element of transition or state
    elem.children("text").attr("fill",color);
}


function markActivated(){//Displays the indicators on the top-right cards
    let stateLeft = $('.activeState1').children("title").html() ? $('.activeState1').children("title").html():'' ;
    let stateRight = $('.activeState2').children("title").html() ? $('.activeState2').children("title").html():'';
    let transition = $('.activeTransition').children("title").html() ;


    $("#spanCard1").text(stateLeft);
    $("#spanCard3").text(stateRight);
    if(transition){
        stateArray = transition.split("-&gt;");
        if(stateArray[0]==stateArray[1]){
            if(stateArray[0] ==$("#spanCard1").text()){
                $("#spanCard2").html("&#11148;");
            }else{
                $("#spanCard2").html("&#11150;");
            }
        }else if(stateArray[0] ==$("#spanCard1").text()){
            $("#spanCard2").html("&#129062;");
        }else{
            $("#spanCard2").html("&#129060;");
        }
    }else{
        $("#spanCard2").html("");
    }
}

function greyTransitions(){//Grey all transitions of the diagram
    $(".transition polygon",svgRoot).off();//Prevent from clicking on a transition
    $(".transition",svgRoot).each( function(){
        $(this).children("polygon").attr("fill","grey");
        $(this).children("polygon").attr("stroke","grey");
        $(this).children("path").attr("stroke","grey");
        colorTextElement($(this),"grey");
    });
    greyed=true;
}

function highlightState(stateName){//Highlight a particular state by making it orange and greying all other elements
    clearListeners();
    $(".state.regular",svgRoot).each( function(){
        if($(this).children("text").html()!=stateName){
            $(this).children("path").attr("stroke","grey");
            colorTextElement($(this),"grey");
        }else{
            $(this).children("path").attr("stroke","orange");
            colorTextElement($(this),"orange");
        }
    });
    $(".state.initial, .state.final",svgRoot).each( function(){
        if($(this).children("title").html()!=stateName){
            $(this).children("ellipse").attr("fill","grey");
            $(this).children("ellipse").attr("stroke","grey");
        }else{
            $(this).children("ellipse").attr("stroke","orange");
            $(this).children("ellipse").attr("fill","orange");
        }
    });
    greyTransitions();
}

function notify(notification, link= false){//Create the toast notification from the object passed in parameter
    let notifObj = {
        heading: notification.title,
        text: notification.text,
        icon: notification.icon ? notification.icon:null,
        position: notification.position ? notification.position:'bottom-center',
        stack: false,
        allowToastClose: notification.close ? notification.close:true,
        hideAfter: notification.duration,
        loaderBg: '#FFFFFF'
    } 
    if(link){
        notif = $.toast(notifObj);
    }else{
        $.toast(notifObj);
    }
}

function empty(isEmpty){
    if (isEmpty){
        let notif = {
            title : "Le diagramme est vide",
            text : "Poser une carte pour commencer",
            position : 'bottom-center',
            duration : false,
            close : false
        }
        notify(notif, true);
    }else{
        if(notif){
            notif.reset();
        }
    }
}

function download(){//Download the displayed svg in SVG format (working but not implemented yet)
    var svgData = svgRoot[0].outerHTML.replace(/&nbsp;/g,"")
    var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "newesttree.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

////////////////////////
//SERVER COMMUNICATING//
////////////////////////

//Send the selected name to the server which saves it in an array
function select(elem, type){
    let name;
    if(type=='transition'){
        name = elem.parent().children("text").html();
        name = name.replace(/&nbsp;/g, '').replace(/\[.*\]/g, '').replace(/\\.*/g, '').trim();
    }else{
        name = elem.parent().children("title").html().replace(/cluster_/g, '');
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
function unlink(){//Tells the server to unlink the current mapping card from the state it's attached to
    socket.emit("unlink",mappingCard);
    let notif = {
        title : "Carte détachée",
        text : "La carte a été détachée de son état associé",
        position : 'bottom-center',
        duration : 3000,
        close : false
    }
    notify(notif, true);
    closeInfo();
}


function closeInfo(){//Closes the info buttons
    resetSelected();
    $("#rotate").css("display","block");
    $("#detach").css("display","none");
    $("#close").css("display","none");
    linkSVG();
}

function editDialog(){//Prepares the dialog box for when clicking on the edit button
    let oldName;
    let height = 400;
    //Shows or hides inputs depending on selected elem infos
    if(selectedType=="state"){

        oldName = $(".selected").children("text").html()
        if(selectedElem.actions==undefined){
            $('label[for=input2], input#input2').hide();
            $('label[for=input3], input#input3').hide();
            height = 250;
        }else if (selectedElem.actions.length > 0) {
            $('label[for=input3], input#input3').hide();
            $('label[for=input2], input#input2').show();
            $('label[for=input2]').html(selectedElem.actions[0].type);
            $('#input2').val(selectedElem.actions[0].body);
            height = 300;
            if (selectedElem.actions.length > 1) {
                $('label[for=input3], input#input3').show();
                $('label[for=input3]').html(selectedElem.actions[1].type);
                $('#input3').val(selectedElem.actions[1].body)
                height = 350;
            }
        }

        
    
    }else if(selectedType=="transition"){
        oldName = selectedElem.event;
        if(selectedElem.cond==undefined){
            $('label[for=input2], input#input2').hide();
        }else{
            $('label[for=input2], input#input2').show();
            $('label[for=input2]').html("garde");
            $('#input2').val(selectedElem.cond);
        }
        if (selectedElem.action==undefined){
            $('label[for=input3], input#input3').hide();
        }else{
            $('label[for=input3], input#input3').show();
            $('label[for=input3]').html("action");
            $('#input3').val(selectedElem.action);
        }
        
    }

    //Creates the dialog box
    $("#name").val(oldName);
    dialog= $( "#dialog" ).dialog({
        height: height,
        width: 350,
        modal: true,
        buttons: {
            "Supprimer": deleteElem,
            "Appliquer": rename,
        },
        close: function() {
            resetSelected();
        }
    });
    
}

function deleteElem(){//Deletes the selected element
    socket.emit('delete',selectedElem, selectedType);//Sending request to server
    dialog.dialog( "close" );
}

function rename(){//Renames the selected element
    let newName= $("#name").val();
    let elem = {
        oldName: '',
        newName: undefined,
        action1: undefined,
        action2: undefined, 
        cond : undefined,
        action : undefined,
    }
    if(selectedType=="state"){
        let newAction1= $("#input2").val();
        let newAction2= $("#input3").val();
        elem.oldName = selectedElem.name;

        if(elem.oldName!=newName && newName!==null){//Changing state name
            elem.newName = newName;  
        }

        if(selectedElem.actions){
            if(newAction1!==selectedElem.actions[0] && newAction1!==''){//Changing state first action
                elem.action1 = newAction1;
            }

            if(newAction2!==selectedElem.actions[1] && newAction2!==''){//Changing state second action
                elem.action2 = newAction2;
            }
        }
        socket.emit('rename',elem, "state");//Sending request to server
        linkSVG();


    }else if(selectedType=="transition"){
        elem.oldName = $(".selected").children("text").html().replace(/&nbsp;/g, '').replace(/\[.*\]/g, '').replace(/\\.*/g, '').trim();

        if(elem.oldName!=newName && newName!==null){
            elem.newName = newName;
        }
        
        if(selectedElem.cond){
            elem.cond=$("#input2").val();
        }
        if(selectedElem.action){
            elem.action=$("#input3").val();
        }
        socket.emit('rename',elem, "transition");
        linkSVG();
    }
    dialog.dialog( "close" );

}

function clearListeners(){//Remove the click listeners to free memory
    $(".state.regular polygon",svgRoot).off();
    $(".state.initial ellipse",svgRoot).off();
    $(".transition polygon",svgRoot).off();
    $(".cluster text",svgRoot).off();
}

function changeDirection(){//Rotates the display
    clearListeners();
    socket.emit('direction');
    linkSVG();
}
