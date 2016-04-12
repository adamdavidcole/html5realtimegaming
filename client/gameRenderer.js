/**
 * Created by adamcole on 4/3/16.
 */
//var p2Render = require('/Users/adamcole/Documents/Penn2016Spring/CIS497/untitled1/node_modules/p2/build/p2.renderer.js');
var game = require('../shared/game.core2.js');
var inputHandler = require('./inputHandler');
var bodyTypes = require('../shared/constants').bodyTypes;
var inputSequenceNumber = 0;
var last_ts;
var mpx = function (v) {
    return v *= 20;
};

var renderer, container, graphics, zoom;

var graphicObjs = {};
var players = [];

var newPlayer = function(player) {
    var graphics = new PIXI.Graphics();
    graphics.beginFill(0x0000ff);
    var boxShape = player.shapes[1];
    graphics.drawRect(-mpx(boxShape.width/2), -mpx(boxShape.height/2), mpx(boxShape.width), mpx(boxShape.height));
    var circleShape = player.shapes[0];
    graphics.beginFill(0xff0000);
    graphics.drawCircle(0, 0, mpx(circleShape.radius));
    graphicObjs[player.id] = {
        graphics: graphics,
        body: player
    };
    players.push(player);
    container.addChild(graphics);
    return graphicObjs[player.id];
};

var player = game.getPlayers()[0];

var createPuck = function() {
    var puckGraphics = new PIXI.Graphics();
    puckGraphics.beginFill(0xff3300);
    var puck = game.getPuck();
    var puckShape = puck.shapes[0];
    puckGraphics.drawCircle(0, 0, mpx(puckShape.radius));
    graphicObjs[puck.id] = {
        graphics: puckGraphics,
        body: puck
    };
    container.addChild(puckGraphics);
};

var createArena = function() {
    var arenaWalls = game.getArenaWalls();
    arenaWalls.forEach(function (body) {
        var graphics =  new PIXI.Graphics();
        var pos_x = mpx(body.position[0]);
        var pos_y = mpx(body.position[1]);
        var angle = body.angle;
        var boxShape = body.shapes[0];
        if (!boxShape) return;
        graphics.beginFill(0xff00ff);
        graphics.drawRect(-mpx(boxShape.width/2), -mpx(boxShape.height/2), mpx(boxShape.width), mpx(boxShape.height));
        graphics.rotation = angle;
        graphics.position.x = pos_x;
        graphics.position.y = pos_y;
        container.addChild(graphics);
        graphicObjs[body.id] = {
            graphics: graphics,
            body: body
        }
    });
};

var drawBodies = function() {
    game.getWorld().bodies.forEach(function(body) {
        if (!body.bodyType) return;
        if (body.bodyType === bodyTypes.ARENA) {
            drawArena(body);
        } else {
            var graphicObj = graphicObjs[body.id];
            if (!graphicObj) {
                if (body.bodyType === bodyTypes.PLAYER) graphicObj = newPlayer(body);
            }
            var graphics = graphicObj.graphics;
            drawBody(body, graphics)
        }
    });
};

var drawArena = function(body) {
    //var graphics =  new PIXI.Graphics();
    //var pos_x = mpx(body.position[0]);
    //var pos_y = mpx(body.position[1]);
    //var angle = body.angle;
    //var boxShape = body.shapes[0];
    //if (!boxShape) return;
    //var width = mpx(boxShape.width);
    //var height= mpx(boxShape.height);
    //graphics.beginFill(0xff00ff);
    //graphics.drawRect(-mpx(boxShape.width/2), -mpx(boxShape.height/2), mpx(boxShape.width), mpx(boxShape.height));
    //graphics.rotation = angle;
    //graphics.position.x = pos_x;
    //graphics.position.y = pos_y;
    //container.addChild(graphics);
};

var drawBody = function(body, graphics) {
    graphics.position.x = mpx(body.position[0]);
    graphics.position.y = mpx(body.position[1]);
    graphics.rotation = body.angle;
};

var checkForRemovedPlayers = function() {
    if (game.getPlayers().length !== players.length) {
        var existingPlayers = [];
        game.getPlayers().forEach(function(player) {
            existingPlayers.push(player);
        });
        players.forEach(function(player) {
            var indexOfExistingPlayer = existingPlayers.indexOf(player);
            if (indexOfExistingPlayer === -1) {
                var indexOfPlayerToDelete = players.indexOf(player);
                if (indexOfPlayerToDelete > -1) {
                    players.splice(indexOfPlayerToDelete, 1);
                    var graphics = graphicObjs[player.id].graphics;
                    graphics.clear();
                    delete graphicObjs[player.id];
                }
            }
        });
    }
};

var init = function () {
    game.init();
    inputHandler.init();
    // Pixi.js zoom level
    zoom = 1;

    // Initialize the stage
    renderer =  PIXI.autoDetectRenderer(800, 600);
    //stage = new PIXI.Stage(0xFFFFFF);

    // We use a container inside the stage for all our content
    // This enables us to zoom and translate the content
    container =     new PIXI.Container();
    //stage.addChild(container);

    // Add the canvas to the DOM
    document.body.appendChild(renderer.view);

    // Add transform to the container
    container.position.x =  0; // center at origin
    container.position.y =  0;
    container.scale.x =  zoom;  // zoom in
    container.scale.y = zoom; // Note: we flip the y axis to make "up" the physics "up"
    createPuck();
    createArena();
    animate();
    handleInput();
};

function animate(t){
    t = t || 0;
    requestAnimationFrame(animate);

    // Move physics bodies forward in time
    game.getWorld().step(1/60);

    checkForRemovedPlayers();
    drawBodies();
    // Render scene
    renderer.render(container);
    //handleInput();
}


var handleInput = function() {
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
};

module.exports = {
    getGame: function() {return game;},
    init: init
};