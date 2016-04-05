/**
 * Created by adamcole on 4/3/16.
 */
//var p2Render = require('/Users/adamcole/Documents/Penn2016Spring/CIS497/untitled1/node_modules/p2/build/p2.renderer.js');
var game = require('/Users/adamcole/Documents/Penn2016Spring/CIS497/untitled1/shared/game.core2.js');
game.init();

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
    graphics.drawCircle(0, 0, mpx(circleShape.radius));
    graphicObjs[player.id] = {
        graphics: graphics,
        body: player
    };
    players.push(player);
    container.addChild(graphics);
    return graphicObjs[player.id];
};

var player = game.players()[0];

var createPuck = function() {
    var puckGraphics = new PIXI.Graphics();
    puckGraphics.beginFill(0x00ff00);
    var puck = game.getPuck();
    var puckShape = puck.shapes[0];
    puckGraphics.drawCircle(0, 0, mpx(puckShape.radius));
    graphicObjs[puck.id] = {
        graphics: puckGraphics,
        body: puck
    };
    container.addChild(puckGraphics);
}

var drawPlayers = function() {
    var bodies = Object.keys(graphicObjs);
    game.world().bodies.forEach(function(body) {
        if (!body.gameType) return;
        var graphicObj = graphicObjs[body.id];
        if (!graphicObj) {
            if (body.gameType === "player") graphicObj = newPlayer(body);
        }
        var graphics = graphicObj.graphics;
        drawBody(body, graphics)
    });
};

var drawBody = function(body, graphics) {
    graphics.position.x = mpx(body.position[0]);
    graphics.position.y = mpx(body.position[1]);
    graphics.rotation = body.angle;
};


var checkForRemovedPlayers = function() {
    if (game.players().length !== players.length) {
        var existingPlayers = [];
        game.players().forEach(function(player) {
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
    initInput();
    animate();
};

function animate(t){
    t = t || 0;
    requestAnimationFrame(animate);

    // Move physics bodies forward in time
    game.world().step(1/60);

    checkForRemovedPlayers();
    drawPlayers();
    // Render scene
    renderer.render(container);
}

function keyboard(keyCode) {
    var key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;
    //The `downHandler`
    key.downHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isUp && key.press) key.press();
            key.isDown = true;
            key.isUp = false;
        }
        event.preventDefault();
    };

    //The `upHandler`
    key.upHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = false;
            key.isUp = true;
        }
        event.preventDefault();
    };

    //Attach event listeners
    window.addEventListener(
        "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
        "keyup", key.upHandler.bind(key), false
    );
    return key;
};


var initInput = function() {
    //Capture the keyboard arrow keys
    var left = keyboard(37),
        up = keyboard(38),
        right = keyboard(39),
        down = keyboard(40),
        a = keyboard(65),
        d = keyboard(68);

    var moveVelocity = 8;
    var postVelocity = 0;
    right.press = function() {
        player.velocity[0] = moveVelocity;
    };
    right.release = function() {
        player.velocity[0] =postVelocity;
    };
    left.press = function() {
        player.velocity[0] = -moveVelocity;
    };
    left.release = function() {
        player.velocity[0] = -postVelocity;
    };
    up.press = function() {
        player.velocity[1] = -moveVelocity;
    };
    up.release = function() {
        player.velocity[1] = -postVelocity;
    };
    down.press = function() {
        player.velocity[1] = moveVelocity;
    };
    down.release = function() {
        player.velocity[1] = postVelocity;
    };

    var angularMovement = 7.5;
    var postAngularMovement = 0;

    a.press = function() {
        player.angularVelocity -= angularMovement;
    };
    a.release = function() {
        player.angularVelocity = -postAngularMovement;
    };

    d.press = function() {
        player.angularVelocity += angularMovement;
    };
    d.release = function() {
        player.angularVelocity = postAngularMovement;
    };
};

init();
