/**
 * Created by adamcole on 3/31/16.
 */
var userid;
var renderer = require('./gameRenderer');
var inputHandler = require('./inputHandler');
var game = renderer.getGame();

var clientUpdateLoop;
var last_ts;
var inputSequenceNumber = 0;

var clientSidePrediction = true;
var reconciliation = true;
var pending_inputs = [];

renderer.init();
inputHandler.init();

//var socket = io.connect('http://sheltered-tor-10865.herokuapp.com/');
socket.on('onconnected', function (data) {
    console.log("connected to server with id: " + data.userid);
    userid = data.userid;
    game.setUserId(userid);
    socket.emit('requestToJoinRoom', {userid: userid});
});

socket.on('onJoinedRoom', function (data) {
    console.log("joining room:", data);
    userid = data.userid;
    game.setUserId(userid);
    game.applyState(data.state);
    beginClientUpdateLoop();
});

socket.on('onNewPlayer', function (data){
    console.log("adding new player:", data);
    game.applyState(data.state);
});

//socket.on('onPlayerDied', function (data) {
//    console.log("player died:", data);
//    game.removePlayer(data.userid);
//    if (data.userid === userid) {
//        game.setGameOver();
//    }
//});

socket.on('ondisconnect', function(data) {
    console.log("player disconnected with id: " + data.userid);
    game.removePlayerById(data.userid);
});

socket.on('onserverupdate', function(data) {
    game.applyState(data.state);
    var j = 0;
    while (j < pending_inputs.length) {
        var input = pending_inputs[j];
        var last_server_input = data.lastProcessedInput[userid];
        if (input.inputSequenceNumber <= last_server_input) {
            // Already processed. Its effect is already taken into account
            // into the world update we just got, so we can drop it.
            pending_inputs.splice(j, 1);
        } else {
            console.log("reconcilling");
            // Not processed by the server yet. Re-apply it.
            game.processInput(input.inputs, userid);
            j++;
        }
    }
});

var beginClientUpdateLoop = function() {
    clientUpdateLoop = setInterval(function() {
        var inputs = inputHandler.getInputs();
        if (!inputs.length) return;

        var now_ts = +new Date();
        last_ts = last_ts || now_ts;
        var dt_sec = (now_ts - last_ts) / 1000.0;
        last_ts = now_ts;

        var clientInput = {};
        clientInput.dtSec = dt_sec;
        clientInput.inputs = inputs;
        clientInput.userid = game.getUserId();
        clientInput.inputSequenceNumber = inputSequenceNumber++;
        socket.emit('clientInput', {clientInput: clientInput});
        if (clientSidePrediction) {
            game.processInput(clientInput.inputs, clientInput.userid);
        }
        if (reconciliation) {
            pending_inputs.push(clientInput);
        }
    }, 15)
};

var endClientUpdateLoop = function() {
    clearInterval(clientUpdateLoop);
};
