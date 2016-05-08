/**
 * Created by adamcole on 3/31/16.
 */
var userid;
var renderer = require('./gameRenderer');
var inputHandler = require('./inputHandler');
var Game = require('../shared/Game');
var playerStatus = require('../shared/constants').playerStatus;
var gameStatus = require('../shared/constants').gameStatus;
var game// = renderer.getGame();

var clientUpdateLoop;
var last_ts;
var inputSequenceNumber = 0;

var clientSidePrediction = false;
var reconciliation = false;
var pending_inputs = [];

var roomname;
var username;

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
        showInputName();
        //displayRooms(data.rooms);
        //socket.emit('requestToJoinRoom', {userid: userid});
    });

    socket.on('onSubmitName', function(data) {
        username = data.username;
        hideInputName();
        showWelcomeScreen(data.rooms);
    });

    socket.on('onJoinedRoom', function (data) {
        game = new Game(data.roomid, data.hostid, userid);
        game.applyState(data.state);
        renderer.init(game, userid);
        if (game.gameStatus === gameStatus.PLAY) renderer.removePlayer(game.getPlayer(userid));
        hideWelcomeScreen();
        roomname = data.roomname;
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
        hideGameMenuScreen();
        showWelcomeScreen(data.rooms);
    });

    socket.on('onNewPlayer', function (data){
        console.log("adding new player:", data);
        game.applyState(data.state);
        displayPlayers(data.state.players);
        if (game.getPlayers().length > 1) toggleStartButton(true);
        else toggleStartButton(false);
    });

    socket.on('onPlayerExit', function (data) {
        console.log("removing player from room");
        updatePlayersReminingField();
        renderer.removePlayer(game.getPlayer(data.removedPlayerId));
        game.removePlayerFromRoom(data.removedPlayerId);
        game.applyState(data.state);
        displayPlayers(data.state.players);
        console.log(game.getPlayers().length);
        if (game.getPlayers().length > 1) toggleStartButton(true);
        else toggleStartButton(false);
    });

    socket.on('ondisconnect', function(data) {
        console.log("player disconnected with id: " + data.userid);
        if (game) game.removePlayerById(data.userid);
    });

    socket.on('onStartGame', function(data) {
        game.applyState(data.state);
        startGame();
        renderer.showZoomBoard();
        renderer.resetPlayerGraphics(game.getPlayers());
    });

    socket.on('onGameWon', function(data) {
        console.log(data.winner + "won the game");
        endClientUpdateLoop();
        showGameOver(data.winner);
        setTimeout(function() {
            hideGameOver();
            hideGameScreen();
            showGameMenuScreen(game.getGameState());
        }, 5000)
    });

    socket.on('onserverupdate', function(data) {
        var changedState = checkForChangedPlayerState(data.state.players);

        game.applyState(data.state);

        if (changedState.dead.length !== 0) {
            changedState.dead.forEach(function (deadPlayer) {
                console.log(deadPlayer);
                renderer.removePlayer(game.getPlayer(deadPlayer.userid));
                if (deadPlayer.userid === userid) makePlayerDead();
            });
            updatePlayersReminingField();
        }
        if (changedState.removed.length !== 0) {
            changedState.removed.forEach(function (removedPlayer) {
                renderer.removePlayer(removedPlayer);
                game.removePlayerFromRoom(removedPlayer.userid);
            });
            updatePlayersReminingField();
        };
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

};

var latency = 0;

var fixedTimeStep = 1 / 60;
var maxSubSteps = 10;

var beginClientUpdateLoop = function() {
    inputHandler.init();
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
        clientInput.userid = userid;
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
        } else socket.emit('clientInput', {userid: userid, roomid: game.getRoomId(), clientInput: clientInput});
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
       // hideGameMenuScreen();
        socket.emit('showWelcomeScreen', {userid: userid, roomid: game.getRoomId()});
    });

    $('#game-start-button').click(function() {
        if (game.getPlayers().length < 2 || game.gameStatus === gameStatus.PLAY) return;
        socket.emit('requestToBeginGame', {userid: userid, roomid: game.getRoomId()});
    });

    $('#game-list').click(function(e) {
        var roomid = $(e.target).attr("data-roomid");
        if (roomid) socket.emit('requestToJoinRoom', {userid: userid, roomid: roomid});
    });

    $('#player-outcome-x').click(function() {
       $('#player-outcome-container').hide();
    });

    $('#game-spectate-button').click(function() {
        hideGameMenuScreen();
        showGameScreen();
        renderer.showFullBoard();
    });

    $('#goto-menu').click(function (){
        showGameMenuScreen();
    });

    $('#game-resume-button').click(function() {
        hideGameMenuScreen();
        showGameScreen();
    });

    $('#name-submit').click(function () {
        var inputVal = $('#name-input').val();
        if (!inputVal || inputVal.trim().length === 0) return;
        else {
            username = inputVal;
            socket.emit('submitName', {userid: userid, username: username});
        }
    });
};

var displayRooms = function(rooms) {
    $('#game-list').empty();
    if (rooms.length === 0) $('#game-list').append($('<li>').text('No Games in Session'));
    rooms.forEach(function(room) {
        var item =  $('<li>');
        item.text(room.roomname);
        item.attr('data-roomid', room.roomid);
        $('#game-list').append(item);
    });
};

var displayPlayers = function(players) {
    $('#players-in-room ul').empty();
    players.forEach(function (player) {
       $('#players-in-room ul').append($('<li>').text(player.username));
    });
};

var showInputName = function() {
    $('#name-input-container').css('display', 'flex');
};

var hideInputName = function() {
    $('#name-input-container').css('display', 'none');
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
    if (!state) state = game.getGameState();
    $('#game-menu-container').show();
    if (game.getPlayers().length > 1) toggleStartButton(true);
    else toggleStartButton(false);
    $('#players-in-room h3').text("Players in " + roomname);
    displayPlayers(state.players);
    setSpectateButton();
};

var toggleStartButton = function(activate) {
    if (!game) $('#game-start-button').css('background-color', 'rgba(0,0,0,.3)');
    else if (game.gameStatus === gameStatus.PLAY) $('#game-start-button').css('background-color', 'rgba(0,0,0,.3)');
    else if (game.getPlayers().length < 2) $('#game-start-button').css('background-color', 'rgba(0,0,0,.3)');
    else $('#game-start-button').css('background-color', 'rgba(0,0,0,1)');
};

var setSpectateButton = function() {
    console.log(game.gameStatus);
    if (game.gameStatus === gameStatus.WAIT) {
        console.log("hide spectate");
        $('#game-spectate-button').hide();
        $('#game-resume-button').hide();
    }
    else if (game.gameStatus === gameStatus.PLAY) {
        console.log("show spectate");
        console.log(game.getPlayer(userid).playerStatus);
        if (game.getPlayer(userid).playerStatus === playerStatus.ALIVE) {
            $('#game-resume-button').show();
            $('#game-spectate-button').hide();
        } else {
            $('#game-resume-button').hide();
            $('#game-spectate-button').show();
        }
    }
};

var hideGameMenuScreen = function() {
    hideGameScreen();
    $('#game-menu-container').hide();
};

var showGameScreen = function() {
    $('canvas').show();
    showGameHeader();
};

var hideGameScreen = function() {
  $('canvas').hide();
    hideGameHeader();
};

var showGameHeader = function() {
    updatePlayersReminingField();
    $('#players-remaining').show();
    $('#goto-menu').show();
};

var showPlayerOutcome = function(didWin) {
    if (game.getAlivePlayerCount() === 1) return; // MAYBE CHANGE THIS!
    if (didWin) {
        $('#player-outcome').text("YOU WIN!");
    } else {
        $('#player-outcome').text("YOU DIED!");
    }
    $('#player-outcome-container').show();
    setInterval(function() {
        $('#player-outcome-container').hide();
    }, 5000)
};

var hideGameHeader = function() {
    $('#players-remaining').hide();
    $('#goto-menu').hide();
};

var showGameOver = function(winnerid) {
    var winner = game.getPlayer(winnerid);
    $('#game-over-container').text(winner.username + " WINS!");
    $('#game-over-container').show();
}

var hideGameOver = function() {
    $('#game-over-container').hide();
}

var updatePlayersReminingField = function() {
    $('#players-remaining').text("Players Remaining: " + game.getAlivePlayerCount() + "/" + game.getPlayers().length);
    if (game.getAlivePlayerCount() === 1) console.log("PLAYER 1 WINS");
};

var startGame = function() {
    game.startGame();
    hideGameMenuScreen();
    showGameScreen();
    beginClientUpdateLoop();
};

init();

var makePlayerDead = function() {

    showPlayerOutcome(false);
    renderer.showFullBoard();
};

var checkForChangedPlayerState = function(updatedPlayers) {
    var changedState = {
        removed: [],
        dead: []
    };
    game.getPlayers().forEach(function (player) {
        var updatedPlayer;
        for (var i = 0; i < updatedPlayers.length; i++) {
            if (player.userid === updatedPlayers[i].userid) updatedPlayer = updatedPlayers[i];
        }
        if (!updatedPlayer) changedState.removed.push(player);
        else if (updatedPlayer.playerStatus !== player.playerStatus &&
            updatedPlayer.playerStatus === playerStatus.DEAD) {
            console.log("DEAD PLAYER");
            changedState.dead.push(updatedPlayer);
        }
    });
    return changedState;
};