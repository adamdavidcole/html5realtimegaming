/**
 * Created by adamcole on 4/5/16.
 */
var io;
var game = require('../shared/game.core2');
var uuid = require('node-uuid');

var sockets = {};
var lastProcessedInput = {};

var init = function(io) {
    //io = _io;
    game.init();
    initIO(io);
};

//var latency = 250;
var updates_per_sec = 30;

var initIO = function(io) {
    io.on('connection', function (socket) {
        socket.userid = uuid();
        console.log("socket connected with id: " + socket.userid);
        sockets[socket.userid] = socket;
        socket.emit('onconnected', { userid: socket.userid });
        socket.on('requestToJoinRoom', function (data) {
            console.log('requesttojoinroom')
            game.createPlayer(socket.userid);
            lastProcessedInput[socket.userid] = 0;
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
            lastProcessedInput[data.clientInput.userid] = data.clientInput.inputSequenceNumber;
            game.processInput(data.clientInput.inputs, data.clientInput.userid, data.clientInput.dtSec);
        });

        socket.on('newGame', function(data) {

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
        game.getWorld().step(fixedTimeStep, timeSinceLastCall, maxSubSteps);
        lastTimeMilliseconds = timeMilliseconds;
    }, 15);

    var serverUpdateLoop = setInterval(function() {
        var state = game.getGameState();
        io.sockets.emit('onserverupdate', {state: state, lastProcessedInput:lastProcessedInput});
    }, 1000 / updates_per_sec);
};

module.exports = {
    init: init
};