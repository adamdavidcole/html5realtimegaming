/**
 * Created by adamcole on 3/31/16.
 */
var userid;

var socket = io.connect('http://10.0.1.4:3000');
socket.on('onconnected', function (data) {
    console.log("connected to server with id: " + data.userid);
    userid = data.userid;
    if (!gameReady) {
        var waitForGameReady = setInterval(function() {
            if (gameReady) {
                clearInterval(waitForGameReady);
                socket.emit('requestToJoinRoom', {userid: userid});
                console.log("gameready", gameReady);
            }
        }, 15);
    }
});

socket.on('onJoinedRoom', function (data) {
    console.log("joining room:", data);
    userid = data.userid;
    for (var userid in data.players) {
        var player = data.players[userid];
        console.log(player);
        createPlayer(player.userid, player.x, player.y);
    }
});

socket.on('onNewPlayer', function (data){
    console.log("adding new player:", data);
    createPlayer(data.player.userid, data.player.x, data.player.y);
});

socket.on('ondisconnect', function(data) {
    console.log("player disconnected with id: " + data.userid);
    removePlayer(data.userid);
});

socket.on('playerMoved', function(data) {
    var player = getPlayer(data.player.userid);
    positionPlayer(player, data.player.x, data.player.y);
});


setInterval(sendUpdatedPosition, 15);

var sendUpdatedPosition = function() {
    if (!gameReady) return;
    var player = getPlayer(userid);
    if (player) socket.emit("updatePosition", {userid: player.userid, x: player.position.x, y: player.position.y});
};