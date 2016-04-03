/**
 * Created by adamcole on 2/16/16.
 */
//var shared = require('./game.server.js');

//var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
var game;
var BACKGROUND_COLOR = '#ddd';
var playersCollisionGroup;
var arenaCollisionGroup;
var puckCollisionGroup;
var arena;
var puck;
var cursors;
var wasd;
var spacebar;
var timer;
var userid;
var isServer;

var players;
var player1;

var moveVelocity = 100;
var rotateVelocity = 200;

var serverStateUpdateLoop;
var serverStateUpdateLoopFreq = 45;

var io;

gameReady = false;
gameOver = false;

function preload() {
    game.load.image('player', 'images/player.png');
    game.load.image('arena', 'images/arenaStroke.png');
    game.load.image('puck', 'images/puck.png')
    game.load.physics('arenaStrokeData', 'images/objects/arenaStroke.json');

    game.stage.backgroundColor = BACKGROUND_COLOR;
}

function serverPreload() {
    game.load.image('player', __dirname + '/images/player.png');
    game.load.image('arena',__dirname + '/images/arenaStroke.png');
    game.load.image('puck', __dirname + '/images/puck.png')
    game.load.physics('arenaStrokeData', __dirname + '/images/objects/arenaStroke.json');

    game.stage.backgroundColor = BACKGROUND_COLOR;
    console.log('server game preloaded');
}

function create() {
    //  Enable P2
    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.restitution = .8;
    //game.physics.p2.friction = 0;
    //game.physics.p2.applyGravity = false;

    //  Turn on impact events for the world, without this we get no collision callbacks
    game.physics.p2.setImpactEvents(true);
    // adjust the bounds to use its own collision group
    game.physics.p2.updateBoundsCollisionGroup();

    // create collision groups
    playersCollisionGroup = game.physics.p2.createCollisionGroup();
    arenaCollisionGroup = game.physics.p2.createCollisionGroup();
    puckCollisionGroup = game.physics.p2.createCollisionGroup();

    // create arena
    //arena = game.add.sprite(game.width / 2, game.height / 2, 'arena');
    //game.physics.p2.enable(arena, true);
    //arena.body.clearShapes();
    //arena.body.loadPolygon('arenaStrokeData', 'arenaStroke');
    //arena.body.setCollisionGroup(arenaCollisionGroup);
    //arena.body.static = true;
    //arena.body.collides(puckCollisionGroup);
    createArena();

    // create game puck
    puck = game.add.sprite(game.width / 2, game.height / 2, 'puck');
    puck.scale.setTo(.2,.2);
    game.physics.p2.enable(puck, true);
    puck.body.setCircle(puck.width / 2);
    puck.body.setCollisionGroup(puckCollisionGroup);
    puck.body.collides([playersCollisionGroup, arenaCollisionGroup]);

    // create players group
    players = game.add.group();
    players.enableBody = true;
    players.physicsBodyType = Phaser.Physics.P2JS;

    cursors = game.input.keyboard.createCursorKeys();
    cursors.rotateRight = game.input.keyboard.addKey(Phaser.Keyboard.D);
    cursors.rotateLeft = game.input.keyboard.addKey(Phaser.Keyboard.A);
    cursors.spacebar =  game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    gameReady = true;
    console.log('server game created');
    //initiateTimer();
};

// update the game state
function update() {
    //console.log(puck.body.x);
    players.children.forEach(function (player) {
        // update the player and check if it is in bounds
        if (player.userid === userid) {
            updatePlayer(player, cursors);
        }
        //if (!isPlayerWithinArena(player)) player.kill();
    });
    //sendUpdatedPosition();
};

var updatePlayer = function(player, controls) {
    // controls to rotate character
    if (controls.rotateLeft.isDown) {
        player.body.rotateLeft(rotateVelocity);
    } else if (controls.rotateRight.isDown) {
        player.body.rotateRight(rotateVelocity);
    } else {
        player.body.setZeroRotation();
    }

    //if (controls.up.isDown) {
    //    player.body.thrust(150);
    //} else if (controls.down.isDown) {
    //    player.body.reverse(150);
    //}

    // controls to move character along axes
    if (controls.left.isDown)
    {
        player.body.moveLeft(moveVelocity);
    }
    else if (controls.right.isDown)
    {
        player.body.moveRight(moveVelocity);
    }

    if (controls.up.isDown)
    {
        player.body.moveUp(moveVelocity);
    }
    else if (controls.down.isDown)
    {
        player.body.moveDown(moveVelocity);
    }
};

var createPlayer = function(userid, x, y) {
    console.log("creating a player", userid);
    console.log("x: ", x, "y: ", y);
    var player = players.create(x, y, 'player');
    player.scale.setTo(.20, .20);
    player.body.setCircle(player.width / 2);
    player.body.addRectangle(125, 15);
    player.body.setCollisionGroup(playersCollisionGroup);
    player.body.collides([playersCollisionGroup, puckCollisionGroup, arenaCollisionGroup]);
    player.body.debug = true;
    player.body.onBeginContact.add(function(bodyA, bodyB, shapeA, shapeB) {
        if (shapeA.constructor.name === "Circle" && shapeB.constructor.name === "Circle") {
            if (isServer) removePlayer(player.userid);
        }
    });
    player.body.mass = 2;
    player.body.damping = .8;
    player.userid = userid;
    //player.body.angularDamping = 0;
    //player.body.fixedRotation = true;
    return player;
};

var removePlayer = function(userid) {
    console.log("removePlayer: ", userid);
    var player = getPlayer(userid);
    if (!player) return;
    player.body.debug = false;
    if (isServer) {
        console.log("player died", player.userid);
        io.sockets.emit('onPlayerDied', {userid: player.userid});
    }
    players.remove(player, false);
    player.kill();
};

var updateArenaSize = function() {
    arena.scale.multiply(.999, .999);
    resizePolygon('arenaStrokeData', 'newArenaStrokeData', 'arenaStroke', arena.scale.x);
    arena.body.clearShapes();
    arena.body.loadPolygon('newArenaStrokeData', 'arenaStroke');
    arena.body.setCollisionGroup(arenaCollisionGroup);
};

var resizePolygon = function(originalPhysicsKey, newPhysicsKey, shapeKey, scale) {
    var newData = [];
    var data = this.game.cache.getPhysicsData(originalPhysicsKey, shapeKey);
    for (var i = 0; i < data.length; i++) {
        var vertices = [];
        for (var j = 0; j < data[i].shape.length; j += 2) {
            vertices[j] = data[i].shape[j] * scale;
            vertices[j+1] = data[i].shape[j+1] * scale;
        }
        newData.push({shape : vertices});
    }
    var item = {};
    item[shapeKey] = newData;
    game.load.physics(newPhysicsKey, '', item);
};


var isPlayerWithinArena = function(player) {
    var dx = arena.body.x - player.body.x; //distance ship X to enemy X
    var dy = arena.body.y - player.body.y;  //distance ship Y to enemy Y
    var dist = Math.sqrt(dx*dx + dy*dy);     //pythagoras ^^  (get the distance to each other)
    if (dist < arena.width/2+player.width/2){  // if distance to each other is smaller than both radii together a collision/overlap is happening
        return true;
    }
    return false;
};

var initiateTimer = function() {
    //  Create our Timer
    timer = game.time.create(false);
    //  Set a TimerEvent to occur after 2 seconds
    timer.loop(50, updateArenaSize, this);
    //  Start the timer running
    timer.start();
};

var getPlayer = function(userid) {
    var thisPlayer;
    if (!players || !players.children) {
        console.log("getPlayer failed, players doesn't exist", userid);
        return;
    }
    players.children.forEach(function (player) {
        if (player.userid === userid) thisPlayer = player;

    });
    if (!thisPlayer) console.log("getPlayer failed, player not found", userid);
    return thisPlayer;
};

var positionPlayer = function(player, x, y) {
    if (!gameReady || !player) return;
    //console.log("POSITINGIN PLAYER", player);
    player.body.x = x;
    player.body.y = y;
};


var isGameReady = function() {
    return gameReady;
};

var setUserId = function(newUserId) {
    userid = newUserId;
};

var createArena = function() {
    // create arena
    arena = game.add.sprite(game.width / 2, game.height / 2, 'arena');
    game.physics.p2.enable(arena, true);
    arena.body.clearShapes();
    arena.body.loadPolygon('arenaStrokeData', 'arenaStroke');
    arena.body.static = true;
    arena.body.setCollisionGroup(arenaCollisionGroup);
    arena.body.collides([playersCollisionGroup, puckCollisionGroup]);
};


var setGame = function(g) {
    game = g;
};

var setState = function() {
    game.state = {
        preload: preload,
        create: create,
        update: update
    };
};


var clientCreateGame = function () {
    game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
    isServer = false;
    return game;
};

var serverCreateGame = function (_io) {
    io = _io;
    game = new Phaser.Game(800, 600, Phaser.HEADLESS, '', { preload: serverPreload, create: create, update: update });
    if (!isGameReady()) {
        console.log("waiting for game to be ready");
        var waitForGameReady = setInterval(function() {
            if (isGameReady()) {
                clearInterval(waitForGameReady);
                server_startStateUpdateLoop();
            }
        }, 15);
    }
    isServer = true;
    return game;
};

var serializeBody = function(sprite, type) {
    var body = sprite.body;
    sBody = {};
    sBody.rotation = body.rotation;
    sBody.angularForce = body.angularForce;
    sBody.angularVelocity = body.angularVelocity;
    sBody.angularDamping = body.angularDamping;
    sBody.damping = body.damping;
    sBody.inertia = body.inertia;
    sBody.force = {
        x: body.force.x,
        y: body.force.y
    };
    sBody.velocity = {
        x: body.velocity.x,
        y: body.velocity.y
    };
    sBody.x = body.x;
    sBody.y = body.y;
    sBody.userid = sprite.userid;
    sBody.type = type;
    return sBody;
};

var deserializeBody = function(sBody) {
    var sprite;
    if (sBody.type === 'player') {
        sprite = getPlayer(sBody.userid);
    } else {
        sprite = puck;
    }

    if (!sprite) return;
    var body = sprite.body;
    body.rotation = sBody.rotation;
    body.rotation = sBody.rotation;
    body.angularForce = sBody.angularForce;
    body.angularVelocity = sBody.angularVelocity;
    body.angularDamping = sBody.angularDamping;
    body.damping = sBody.damping;
    body.inertia = sBody.inertia;

    body.force = {
        x: sBody.force.x,
        y: sBody.force.y
    };

    sBody.velocity = {
        x: sBody.velocity.x,
        y: sBody.velocity.y
    };

    body.x = sBody.x;
    body.y = sBody.y;
};

var getGameState = function() {
    var state = {};
    state.puck = serializeBody(puck, 'puck');
    state.players = [];
    players.children.forEach(function (player) {
        var sBody = serializeBody(player, 'player');
        state.players.push(sBody);
    });
    return state;
};

var server_startStateUpdateLoop = function() {
    serverStateUpdateLoop = setInterval(function () {
        var state = getGameState();
        io.sockets.emit('onserverupdate', {state: state});
    }, serverStateUpdateLoopFreq);
};

var client_applyState = function(state) {
    if (!isGameReady()) return;
    deserializeBody(state.puck);
    state.players.forEach(function (player) {
        deserializeBody(player);
    });
};

var setGameOver = function() {
    gameOver = true; // fix to better thing
};

var isGameOver = function() {
    return gameOver
}

module.exports = {
    preload: preload,
    create: create,
    update: update,
    setUserId: setUserId,
    positionPlayer: positionPlayer,
    isGameReady: isGameReady,
    getPlayer: getPlayer,
    removePlayer: removePlayer,
    createPlayer: createPlayer,
    setGame: setGame,
    setState: setState,
    clientCreateGame: clientCreateGame,
    serverCreateGame: serverCreateGame,
    serializeBody: serializeBody,
    server_startStateUpdateLoop: server_startStateUpdateLoop,
    client_applyState: client_applyState,
    getGameState: getGameState,
    setGameOver: setGameOver,
    isGameOver: isGameOver
};