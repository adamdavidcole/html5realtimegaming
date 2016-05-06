/**
 * Created by adamcole on 4/3/16.
 */
//var p2Render = require('/Users/adamcole/Documents/Penn2016Spring/CIS497/untitled1/node_modules/p2/build/p2.renderer.js');
//var gameCreator = require('../shared/game.core2.js');
var game;
var userid;
var bodyTypes = require('../shared/constants').bodyTypes;
var playerStatus = require('../shared/constants').playerStatus;
var tilingSprite;
var inputSequenceNumber = 0;
var last_ts;
var mpx = function (v) {
    return v *= 20;
};

var renderer, container, graphics, zoom;
var worldWidth = 800;
var worldHeight = 600;

var ball;
var graphicObjs = {};
var players = [];

var newPlayer = function(player) {
    var graphics = new PIXI.Graphics();
    graphics.beginFill(0x0000ff);
    var boxShape = player.shapes[1];
    graphics.drawRect(-mpx(boxShape.width/2), -mpx(boxShape.height/2), mpx(boxShape.width), mpx(boxShape.height));
    var circleShape = player.shapes[0];
    var playerSprite;
    if (userid === player.userid) playerSprite = new PIXI.Sprite.fromImage('images/user.png');
    else playerSprite = new PIXI.Sprite.fromImage('images/oponent.png');
    //graphics.drawCircle(0, 0, mpx(circleShape.radius));

    playerSprite.anchor.x = .5;
    playerSprite.anchor.y = .5;
    playerSprite.scale.x = 1;
    playerSprite.scale.y = 1;
    playerSprite.position.x = 0;
    playerSprite.position.y = 0;
    container.addChild(graphics);
    container.addChild(playerSprite);
    //graphics.clear();


    graphicObjs[player.id] = {
        graphics: graphics,
        body: player,
        sprite: playerSprite
    };
    players.push(player);
    return graphicObjs[player.id];
};

//var player = game.getPlayers()[0];

var createPuck = function() {
    ball = new PIXI.Sprite.fromImage('images/ball.png');
    ball.anchor.x = .5;
    ball.anchor.y = .5;
    ball.scale.x = 1;
    ball.scale.y = 1;
    ball.position.x = 0;
    ball.position.y = 0;
    container.addChild(ball);

    var puckGraphics = new PIXI.Graphics();
    puckGraphics.beginFill(0xff3300);
    var puck = game.getPuck();
    var puckShape = puck.shapes[0];
    puckGraphics.drawCircle(0, 0, mpx(puckShape.radius));
    graphicObjs[puck.id] = {
        graphics: puckGraphics,
        body: puck
    };
    puckGraphics.clear();
    container.addChild(puckGraphics);
};

var createArena = function() {
    var arenaWalls = game.getArenaWalls();
    var textureImage = "images/wood-texture4.png";
    var texture = PIXI.Texture.fromImage(textureImage);
    arenaWalls.forEach(function (body) {
        var woodTilingSprite = new PIXI.TilingSprite(texture, 2*window.innerWidth, 2*window.innerHeight);
        woodTilingSprite.position.x = -window.innerWidth;
        woodTilingSprite.position.y = -window.innerHeight;
        container.addChild(woodTilingSprite);

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

        woodTilingSprite.mask = graphics;

        graphicObjs[body.id] = {
            graphics: graphics,
            body: body
        }
    });

    var endpoints = game.getEndpoints();
    endpoints.forEach(function (body) {
        var woodTilingSprite = new PIXI.TilingSprite(texture, 2*window.innerWidth, 2*window.innerHeight);
        woodTilingSprite.position.x = -window.innerWidth;
        woodTilingSprite.position.y = -window.innerHeight;
        container.addChild(woodTilingSprite);

        var graphics =  new PIXI.Graphics();
        var pos_x = mpx(body.position[0]);
        var pos_y = mpx(body.position[1]);
        var circleShape = body.shapes[0];
        if (!circleShape) return;
        graphics.beginFill(0xff00ff);
        graphics.drawCircle(0, 0, mpx(circleShape.radius));
        graphics.position.x = pos_x;
        graphics.position.y = pos_y;

        container.addChild(graphics);

        woodTilingSprite.mask = graphics
        graphicObjs[body.id] = {
            graphics: graphics,
            body: body
        }
    });
};

var createBackground = function() {
    var texture = PIXI.Texture.fromImage('images/green-texture6.png');
    tilingSprite = new PIXI.TilingSprite(texture, 2*window.innerWidth, 2*window.innerHeight)
    tilingSprite.position.x = -window.innerWidth;
    tilingSprite.position.y = -window.innerHeight;
    container.addChild(tilingSprite);

    //var graphics =  new PIXI.Graphics();
    //graphics.beginFill(0x333333);
    //graphics.drawRect(-mpx(worldWidth/2), -mpx(worldHeight/2), mpx(worldWidth), mpx(worldHeight));
    //container.addChild(graphics);
};

var drawBodies = function() {
    game.getWorld().bodies.forEach(function(body) {
        if (!body.bodyType) return;
        if (body.playerStatus && body.playerStatus !== playerStatus.ALIVE) {
            var graphicsObj = graphicObjs[body.id];
            if (graphicsObj) graphicsObj.graphics.clear();
            return;
        }
        if (body.bodyType === bodyTypes.ARENA || body.bodyType === bodyTypes.ENDPOINT) {
            return;
        } else {
            if (body.bodyType === bodyTypes.PUCK) {
                //console.log(ball);
                ball.position.x =  mpx(body.position[0]);
                ball.position.y =  mpx(body.position[1]);
                ball.rotation = body.angle;
            }
            //else if (body.bodyType === bodyTypes.PLAYER)
            var graphicObj = graphicObjs[body.id];
            if (!graphicObj) {
                if (body.bodyType === bodyTypes.PLAYER) graphicObj = newPlayer(body);
            }
            var graphics = graphicObj.graphics;
            drawBody(body, graphics, graphicObj.sprite)
        }
    });
};

var drawBody = function(body, graphics, sprite) {
    var interpolated = false;
    if (interpolated) {
        graphics.position.x = mpx(body.interpolatedPosition[0]);
        graphics.position.y = mpx(body.interpolatedPosition[1]);
        graphics.rotation = body.interpolatedPosition;
    } else {
        graphics.position.x = mpx(body.position[0]);
        graphics.position.y = mpx(body.position[1]);
        graphics.rotation = body.angle;
        if (sprite) {
            sprite.position.x = mpx(body.position[0]);
            sprite.position.y = mpx(body.position[1]);
            sprite.rotation = body.an√gle;
        }
    }

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

var resetPlayerGraphics = function(players) {
    players.forEach(function (player) {
        console.log("resetgraphics");
        removePlayer(player);
        newPlayer(player);
    });
};

var init = function (_game, _userid) {
    game = _game;
    userid = _userid;
    // Pixi.js zoom level
    zoom = 1.15;

    // Initialize the stage
    renderer =  PIXI.autoDetectRenderer();
    //renderer.autoResize = true;
    //stage = new PIXI.Stage(0xFFFFFF);

    // We use a container inside the stage for all our content
    // This enables us to zoom and translate the content
    container =     new PIXI.Container();
    //stage.addChild(container);
    resize();

    // Add the canvas to the DOM
    document.body.appendChild(renderer.view);
    // Add transform to the container
    container.position.x =  window.innerWidth/2; // center at origin
    container.position.y =  window.innerHeight/2;
    container.scale.x =  zoom;  // zoom in
    container.scale.y = zoom; // Note: we flip the y axis to make "up" the physics "up"
    createBackground();
    createArena();
    createPuck();


    //var interaction = new PIXI.interaction.InteractionManager(renderer);
    container.interactive = true;
    container.mousedown = function(e) {
        var point = e.data.getLocalPosition(container);
        console.log("globX", point.x, "globY", point.y, "pixiX", point.x/20, "pixiY", point.y/20);
    }
    addEvent(window, "resize", resize);

    animate();
};

var resize = function(e) {
    renderer.resize(window.innerWidth, window.innerHeight);
    container.position.x =  window.innerWidth/2;
    container.position.y =  window.innerHeight/2;
};

var positionCamera = function() {
    var player = game.getThisPlayer();
    if (!player || player.playerStatus !== playerStatus.ALIVE) return;
    container.position.x = window.innerWidth/2 - mpx(player.position[0]);
    container.position.y = (window.innerHeight/2) - mpx(player.position[1]);
};

var addEvent = function(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.addEventListener) {
        object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
        object.attachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
};

var fixedTimeStep = 1 / 60;
var maxSubSteps = 10;
var lastTimeMilliseconds;

function animate(t){
    t = t || 0;
    requestAnimationFrame(animate);
    //tilingSprite.tilePosition.x += 1;  tilingSprite.tilePosition.x += 1;
    //checkForRemovedPlayers();
    drawBodies();
    // Render scene
    positionCamera();
    renderer.render(container);
};

var showFullBoard = function() {
    console.log('showfull board');
    zoom = .75;
    container.position.x =  window.innerWidth/2; // center at origin
    container.position.y =  window.innerHeight/2;
    container.scale.x =  zoom;  // zoom in
    container.scale.y = zoom; // Note: we flip the y axis to make "up" the physics "up"
};

var showZoomBoard = function() {
    zoom = 1.15;
    container.position.x =  window.innerWidth/2; // center at origin
    container.position.y =  window.innerHeight/2;
    container.scale.x =  zoom;  // zoom in
    container.scale.y = zoom; // Note: we flip the y axis to make "up" the physics "up"
};

var removePlayer = function(player) {
    var graphicsObj = graphicObjs[player.id];
    if (graphicsObj) {
        console.log('clear graphics');
        graphicsObj.graphics.clear();
    }
    delete graphicObjs[player.id];
};

module.exports = {
    getGame: function() {return game;},
    init: init,
    removePlayer: removePlayer,
    showFullBoard: showFullBoard,
    showZoomBoard: showZoomBoard,
    resetPlayerGraphics: resetPlayerGraphics
};