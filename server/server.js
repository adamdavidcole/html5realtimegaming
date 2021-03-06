/**
 * Created by adamcole on 4/5/16.
 */
var io;
//var newGame = require('../shared/game.core2');
var Game = require('../shared/Game');
var uuid = require('node-uuid');
var gameStatus = require('../shared/constants').gameStatus;
var playerStatus = require('../shared/constants').playerStatus;

var sockets = {};
var lastProcessedInput = {};
var rooms = {};
var usernames = {};
var roomCount = 0;

var init = function(_io) {
    //io = _io;
    //game.init();
    io = _io;
    initIO(io);
};

//var latency = 250;
var updates_per_sec = 30;

var initIO = function(io) {
    io.on('connection', function (socket) {
        socket.userid = uuid();
        console.log("socket connected with id: " + socket.userid);
        sockets[socket.userid] = socket;
        socket.emit('onconnected', {userid: socket.userid, rooms: getRoomsInfo()});
        socket.on('requestToJoinRoom', function (data) {
            console.log('requesttojoinroom')
            var room = rooms[data.roomid];
            if (!room || !room.game) {
                socket.emit("onRoomNoLongerExists", {rooms: getRoomsInfo()});
            } else if (isUserInRoom(room, socket.userid)) return;
            else {
                console.log("username ", usernames[data.userid]);
                room.game.createPlayer(data.userid, usernames[data.userid]);
                //lastProcessedInput[socket.userid] = 0;
                var state = room.game.getGameState();
                socket.emit("onJoinedRoom", {roomid: room.roomid, roomname: room.roomname, host: room.hostid, state: room.game.getGameState(), gameStatus: room.game.gameStatus});
                room.game.getPlayers().forEach(function (player) {
                    if (player.userid !== data.userid) {
                        var playerSocket = sockets[player.userid];
                        playerSocket.emit("onNewPlayer", {state: state, newPlayer: data.userid});
                    }
                });
            }
        });

        socket.on('disconnect', function() {
            console.log("socket disconnected with id: " + socket.userid);
            //game.removePlayerById(socket.userid);
            //deleteRoom(socket.userid);
            deletePlayer(socket.userid);
            delete sockets[socket.userid];
            socket.broadcast.emit("ondisconnect", {userid: socket.userid});
        });

        socket.on('submitName', function(data) {
            socket.username = data.username;
            usernames[data.userid] = data.username;
            console.log(usernames[data.userid]);
            socket.emit('onSubmitName', {username: data.username, rooms: getRoomsInfo()});
        });

        socket.on('clientInput', function(data) {
            //lastProcessedInput[data.clientInput.userid] = data.clientInput.inputSequenceNumber;
            var room = rooms[data.roomid];
            room.game.processInput(data.clientInput.inputs, data.clientInput.userid, data.clientInput.dtSec);
        });

        socket.on('createRoom', function(data) {
            console.log("create room");
            var room = createRoom(data.userid);
            socket.emit("onJoinedRoom", {roomid: room.roomid, roomname: room.roomname, host: room.hostid, state: room.game.getGameState()});
            io.sockets.emit('onRoomCreated', {rooms: getRoomsInfo()});
        });

        socket.on('showWelcomeScreen', function(data) {
            console.log('show welcome screen');
            var room = rooms[data.roomid];
            removePlayerFromRoom(room.roomid, data.userid);
            socket.emit('onShowWelcomeScreen', {rooms: getRoomsInfo()});
        });

        socket.on('requestToBeginGame', function(data) {
            var room = rooms[data.roomid];
            room.game.startGame();
            room.game.gameStatus = gameStatus.PLAY;
            room.game.getPlayers().forEach(function (player) {
                var playerSocket = sockets[player.userid];
                playerSocket.emit('onStartGame', {state: room.game.getGameState()})
            });
        });
    });

    var fixedTimeStep = 1 / 60;
    var maxSubSteps = 10;
    var lastTimeMilliseconds;

    var serverPhysicsLoop = setInterval(function() {
        var timeSinceLastCall = 0;
        var timeMilliseconds = Date.now();
        if(timeMilliseconds !== undefined && lastTimeMilliseconds !== undefined){
            timeSinceLastCall = (timeMilliseconds - lastTimeMilliseconds) / 1000;
        };
        for (var roomid in rooms) {
            var room = rooms[roomid];
            if (room.game) {
                room.game.getWorld().step(fixedTimeStep, timeSinceLastCall, maxSubSteps);
            //    console.log(roomid, room.game.getPlayers().length);
            }
        }

        lastTimeMilliseconds = timeMilliseconds;
    }, 15);

    var serverUpdateLoop = setInterval(function() {
        for (var roomid in rooms) {
            var room = rooms[roomid];
            if (room.game.getAlivePlayerCount() === 1 && room.game.gameStatus === gameStatus.PLAY) {
                gameWon(room);
                room.game.gameStatus = gameStatus.WAIT;
            }
            var state = room.game.getGameState();
            room.game.getPlayers().forEach(function (player) {
                var playerSocket = sockets[player.userid];
                playerSocket.emit('onserverupdate', {state: state, lastProcessedInput: lastProcessedInput})
            });
        }
    }, 1000 / updates_per_sec);
};

var createRoom = function(userid) {
    var newRoomId = uuid();
    var game = new Game(newRoomId, userid);
    game.gameStatus = gameStatus.WAIT;
    game.createPlayer(userid, usernames[userid]);
    var room = {
        game: game,
        roomid: newRoomId,
        hostid: userid,
        roomname: usernames[userid] + "'s room"
    };
    rooms[newRoomId] = room;
    roomCount++;
    return room;
};

var deletePlayer = function(userid) {
    for (var roomid in rooms) {
        var room = rooms[roomid];
        if (room.game.getPlayer(userid)) removePlayerFromRoom(room.roomid, userid);
    }
};

var removePlayerFromRoom = function(roomid, userid) {
    var room = rooms[roomid];
    var player = room.game.getPlayer(userid);
    if (player) {
        room.game.removePlayerFromRoom(userid);
        if (room.game.getPlayers().length === 0) {
            console.log('deleting room');
            delete rooms[roomid];
            roomCount--;
            io.sockets.emit("onRoomDeleted", {rooms: getRoomsInfo()});
        }
        else {
            console.log("notify players of player exit");
            room.game.getPlayers().forEach(function(player) {
                var playerSocket = sockets[player.userid];
                playerSocket.emit("onPlayerExit", {state: room.game.getGameState(), removedPlayerId: userid});
            });
        }
    }
};

var gameWon = function(room) {
    var winner;
    room.game.getPlayers().forEach(function (player) {
        if (player.playerStatus === playerStatus.ALIVE) winner = player;
    });
    room.game.getPlayers().forEach(function (player) {
        var playerSocket = sockets[player.userid];
        playerSocket.emit('onGameWon', {winner: winner.userid})
        //player.playerStatus = playerStatus.IDLE;
    });
};

var getRoomsInfo = function() {
    var roomsInfo = [];
    for (roomid in rooms) {
        var room = rooms[roomid];
        roomsInfo.push({roomid: room.roomid, hostid: room.hostid, state: room.game.getGameState(), roomname: room.roomname});
    }
    return roomsInfo;
};

var isUserInRoom = function(room, userid) {
    if (!room || !room.game) return false;
    else {
        var players = room.game.getPlayers();
        for (var i = 0; i < players.length; i++) {
            if (players[i].userid === userid) return true;
        }
    }
    return false;
}

module.exports = {
    init: init
};