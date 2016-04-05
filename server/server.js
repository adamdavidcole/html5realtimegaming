/**
 * Created by adamcole on 4/5/16.
 */
var io;
var game = require('../shared/game.core2');
var uuid = require('node-uuid');

var sockets = {};

var init = function(io) {
    //io = _io;
    game.init();
    initIO(io);
};


var initIO = function(io) {
    io.on('connection', function (socket) {
        socket.userid = uuid();
        console.log("socket connected with id: " + socket.userid);
        sockets[socket.userid] = socket;
        socket.emit('onconnected', { userid: socket.userid });
        socket.on('requestToJoinRoom', function (data) {
            console.log('requesttojoinroom')
            game.createPlayer(socket.userid);
            var state =  game.getGameState();
            socket.emit("onJoinedRoom", {userid: socket.userid, state:state});
            socket.broadcast.emit("onNewPlayer", {state: state});
        });

        socket.on('disconnect', function() {
            console.log("socket disconnected with id: " + socket.userid);
            game.removePlayerById(socket.userid);
            delete sockets[socket.userid];
            socket.broadcast.emit("ondisconnect", {userid: socket.userid});
        });
        //
        socket.on('clientInput', function(data) {
            game.processInput(data.clientInput.inputs, data.clientInput.userid);
        });
    });

    var serverPhysicsLoop = setInterval(function() {
        game.getWorld().step(1/60);
    }, 15);

    var serverUpdateLoop = setInterval(function() {
        var state = game.getGameState();
        //if (state.players.length) console.log(state.players[0].position);
        io.sockets.emit('onserverupdate', {state: state});
    }, 45);
};

module.exports = {
    init: init
};