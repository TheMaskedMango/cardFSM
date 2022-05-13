
var svgRoot;
var group;
var diagDirection = 0;

$(document).ready(function(){
   init();
})

function toggleSelectedState(elem, color) {
    console.log(elem);
    if(elem.parent().hasClass("selected")){
        elem.parent().children("path").attr("stroke","black");
        elem.parent().removeClass("selected");
    }else{
        resetSelected();
        elem.parent().children("path").attr("stroke",color);
        elem.parent().addClass("selected");
    }
}

function toggleStateByName(name){//Toggle state from its title
    $(".state title",svgRoot).each(function() {
        if($(this).text()==name){
            console.log($(this).parent());
            toggleSelectedState($(this).parent(), "blue");
        }
    });
}

function toggleSelectedTransition(elem, states) {
    if(elem.parent().hasClass("selected")){//If already selected
        elem.parent().children("path").attr("stroke","black");
        elem.parent().children("polygon").attr("fill","black");
        elem.parent().removeClass("selected");
    }else{
        resetSelected();
        toggleStateByName(states[0]);
        elem.parent().children("path").attr("stroke","red");
        elem.parent().children("polygon").attr("fill","red");
        elem.parent().addClass("selected");

    }
}



function resetSelected(){//Remove any selected element state
    $(".state, .transition",svgRoot).removeClass("selected");
    $(".state, .transition",svgRoot).children("path").attr("stroke","black");
    $(".state, .transition",svgRoot).children("polygon").attr("fill","black");
}

function load_diagram(source, orientation = "top-bottom")
   {
      $("body svg")[0].remove();  
      var newScriptTag = document.createElement('script');
      newScriptTag.innerText = 'type="text/x-smcat" src="sample.smcat" data-direction="left-right"';
      $("body").append(newScriptTag);  
   }

function init(){
 //Wait until the svg loads
 var checkExist = setInterval(function() {
    if ($('svg').length==2) {
       console.log("Images chargées");
       clearInterval(checkExist);

       svgRoot = $('svg');
       
       $(svgRoot[1]).css("display","none");//Hiding vertical diagram by default
       $(svgRoot).attr('id', 'svgDiagram');
       $(svgRoot).attr('width', '100%');
       $(svgRoot).attr('height', '100%');



       console.log($(".state",svgRoot));


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
//the svg doc is loaded asynchronously
}
