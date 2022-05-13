const express = require('express');
const fs = require('fs');
const smcat = require("state-machine-cat");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var diagJSON;


app.use(express.static(__dirname + '/public'));
app.use("/css", express.static(__dirname + '/css'));
app.use("/script", express.static(__dirname + '/script'));
app.use("/images", express.static(__dirname + '/images'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  renderFromJSON('left-right', socket);

  socket.on('direction', (dir) => {
    console.log('direction: ' + dir);
    renderFromJSON(dir, socket);
  });

  socket.on('rename', (rename) => {
    console.log('name to change: ' + rename[0]+" with: "+ rename[1]);
  });


});

server.listen(3000, () => {
  console.log('listening on *:3000');
});


function renderFromJSON(dir, socket){
  fs.readFile(__dirname + "/diagramme.json", (error, data) => {
      if(error) {
          throw error;
      }
      diagJSON=JSON.parse(data.toString());
      renderSVG(diagJSON,dir, socket);;
  });
}


function renderSVG(source, dir, socket){
  

  try {
      const lSVGInAString = smcat.render(source,{inputType: "json",outputType: "svg", direction: dir});
      //console.log('Le SVG a été créé avec succès');
      socket.emit("svg",lSVGInAString);
      //fs.writeFile('diagramme.svg', lSVGInAString, function (err) {
      //    if (err) throw err;
      //    console.log('File is created successfully.');
      //});
  } catch (pError) {
      console.error(pError);
  }


}
