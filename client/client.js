/**
 * Created by adamcole on 3/31/16.
 */
var userid;
var renderer = require('./gameRenderer');
var inputHandler = require('./inputHandler');
var Game = require('../shared/Game');
var game// = renderer.getGame();

var clientUpdateLoop;
var last_ts;
var inputSequenceNumber = 0;

var clientSidePrediction = false;
var reconciliation = false;
var pending_inputs = [];

var room;

var socket = io.connect("http://10.0.1.4:3000");

var init = function() {
    //renderer.init();
    //inputHandler.init();
    attachEventHandlers();
    initSocket();
};

var initSocket = function() {
    socket.on('onconnected', function (data) {
        console.log("connected to server with id: " + data.userid);
        userid = data.userid;
        displayRooms(data.rooms);
        //socket.emit('requestToJoinRoom', {userid: userid});
    });

    socket.on('onJoinedRoom', function (data) {
        console.log(data);
        game = new Game(data.roomid, data.hostid, userid);
        game.applyState(data.state);
        renderer.init(game);
        hideWelcomeScreen();
        showGameMenuScreen(data.state);
        //beginClientUpdateLoop();
    });

    socket.on('onRoomCreated', function (data){
        displayRooms(data.rooms);
    });

    socket.on('onRoomDeleted', function(data) {
        displayRooms(data.rooms);
    });

    socket.on('onRoomNoLongerExists', function (data) {
        alert("Room No Longer Exists");
        showWelcomeScreen(data.rooms);
    });

    socket.on('onShowWelcomeScreen', function(data) {
        showWelcomeScreen(data.rooms);
    });

    socket.on('onNewPlayer', function (data){
        console.log("adding new player:", data);
        game.applyState(data.state);
        displayPlayers(data.state.players);
    });

    socket.on('onPlayerExit', function (data) {
        console.log("removing player from room");
        game.applyState(data.state);
        displayPlayers(data.state.players);
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
        if (game) game.removePlayerById(data.userid);
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
                console.log(input.inputSequenceNumber - last_server_input);
                //console.log("reconcilling");
                // Not processed by the server yet. Re-apply it.
                game.processInput(input.inputs, userid, input.dtSec);
                j++;
            }
        }
    });

}


var latency = 0;





var fixedTimeStep = 1 / 60;
var maxSubSteps = 10;

var beginClientUpdateLoop = function() {
    clientUpdateLoop = setInterval(function() {
        var inputs = inputHandler.getInputs();

        var now_ts = +new Date();
        last_ts = last_ts || now_ts;
        var dt_sec = (now_ts - last_ts) / 1000.0;
        last_ts = now_ts;

        var clientInput = {};
        clientInput.dtSec = dt_sec;
        //game.getWorld().step(fixedTimeStep, dt_sec, maxSubSteps);
        if (!inputs.length) return;

        clientInput.inputs = inputs;
        clientInput.userid = game.getUserId();
        clientInput.inputSequenceNumber = inputSequenceNumber++;

        if (clientSidePrediction) {
            //console.log("clientsidepredict: ", clientInput.inputs);
            console.log(clientInput.dtSec);
            game.processInput(clientInput.inputs, clientInput.userid, clientInput.dtSec);
        }
        if (reconciliation) {
            pending_inputs.push(clientInput);
        } else pending_inputs = [];
        if (latency) {
            setTimeout(function () {
                socket.emit('clientInput', {clientInput: clientInput});
            }, latency);
        } else socket.emit('clientInput', {clientInput: clientInput});
    }, 15)
};

var endClientUpdateLoop = function() {
    clearInterval(clientUpdateLoop);
};

var newGame = function() {
    socket.emit('newGame', {userid: userid});
};

var attachEventHandlers = function() {
    $("#create-game-container").click(function() {
        console.log("clicked")
        socket.emit("createRoom", {userid: userid});
    });

    $('#game-exit-button').click(function() {
        hideGameMenuScreen();
        socket.emit('showWelcomeScreen', {userid: userid, roomid: game.getRoomId()});
    });

    $('#game-list').click(function(e) {
        var roomid = $(e.target).attr("data-roomid");
        if (roomid) socket.emit('requestToJoinRoom', {userid: userid, roomid: roomid});
    });
};

var displayRooms = function(rooms) {
    console.log(rooms);
    $('#game-list').empty();
    if (rooms.length === 0) $('#game-list').append($('<li>').text('No Games in Session'));
    rooms.forEach(function(room) {
        var item =  $('<li>');
        item.text(room.roomid);
        item.attr('data-roomid', room.roomid);
        $('#game-list').append(item);
    });
};

var displayPlayers = function(players) {
    $('#players-in-room ul').empty();
    players.forEach(function (player) {
       $('#players-in-room ul').append($('<li>').text(player.userid));
    });
};

var showWelcomeScreen = function(rooms) {
    $('#create-game-container').show();
    $('#game-list-container').show();
    displayRooms(rooms);
};

var hideWelcomeScreen = function() {
    $('#create-game-container').hide();
    $('#game-list-container').hide();
};

var showGameMenuScreen = function(state) {
    $('#game-menu-container').show();
    displayPlayers(state.players);
};

var hideGameMenuScreen = function() {
    $('#game-menu-container').hide();
}

init();