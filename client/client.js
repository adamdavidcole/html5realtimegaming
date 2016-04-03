/**
 * Created by adamcole on 3/31/16.
 */
var userid;
var socket = io.connect('http://10.0.1.4:3000');
var game = require('../shared/game.core');
var gameObj = game.clientCreateGame(socket);

socket.on('onconnected', function (data) {
    console.log("connected to server with id: " + data.userid);
    userid = data.userid;
    game.setUserId(userid);
    if (!game.isGameReady()) {
        console.log("waiting for game to be ready")
        var waitForGameReady = setInterval(function() {
            if (game.isGameReady()) {
                clearInterval(waitForGameReady);
                socket.emit('requestToJoinRoom', {userid: userid});
                console.log("gameready", game.isGameReady());
            }
        }, 15);
    }
});

socket.on('onJoinedRoom', function (data) {
    console.log("joining room:", data);
    userid = data.userid;
    data.state.players.forEach(function (player) {
        game.createPlayer(player.userid, player.x, player.y);
    });
    console.log("gamestate on startup:", data.state);
    game.client_applyState(data.state);
});

socket.on('onNewPlayer', function (data){
    console.log("adding new player:", data);
    game.createPlayer(data.player.userid, data.player.x, data.player.y);
});

socket.on('onPlayerDied', function (data) {
    console.log("player died:", data);
    game.removePlayer(data.userid);
    if (data.userid === userid) {
        game.setGameOver();
    }
});

socket.on('ondisconnect', function(data) {
    console.log("player disconnected with id: " + data.userid);
    game.removePlayer(data.userid);
});

socket.on('onserverupdate', function(data) {
    game.client_applyState(data.state);
});

//var clientGameUpdateLoop = setInterval(function () {
//    sendUpdatedPosition();
//}, 15);
//
//var sendUpdatedPosition = function() {
//    if (!game.isGameReady() || game.isGameOver()) return;
//    var player = game.getPlayer(userid);
//    if (player) socket.emit("updatePosition", {userid: player.userid, x: player.position.x, y: player.position.y});
//};