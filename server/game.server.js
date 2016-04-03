/**
 * Created by adamcole on 4/2/16.
 */
/**
 * Created by adamcole on 2/16/16.
 */
//var shared = require('./../public/javascripts/game.server.js');
var gameCore = require('/Users/adamcole/Documents/Penn2016Spring/CIS497/untitled1/shared/game.core.js');
p2 = require('p2');
var stubs = require('./phaser/server/lib/stubs');
var game;
var io;
var waitForPhaser = setInterval(function() {
    if (stubs.isPhaserReady()) {
        clearInterval(waitForPhaser);
        console.log("phaser ready!");
        gameCore.serverCreateGame(io);
    }
}, 50);


var init = function (_io) {
    io = _io;
};

module.exports = {
    gameCore: gameCore,
    init: init
};