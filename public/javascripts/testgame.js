/**
 * Created by adamcole on 2/16/16.
 */
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
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

var players;
var player1;

var moveVelocity = 100;
var rotateVelocity = 200;

function preload() {
    game.load.image('player', 'images/player.png');
    game.load.image('arena', 'images/arenaStroke.png');
    game.load.image('puck', 'images/puck.png')
    game.load.physics('arenaStrokeData', 'images/objects/arenaStroke.json');

    game.stage.backgroundColor = BACKGROUND_COLOR;
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
    arena = game.add.sprite(game.width / 2, game.height / 2, 'arena');
    game.physics.p2.enable(arena, true);
    arena.body.clearShapes();
    arena.body.loadPolygon('arenaStrokeData', 'arenaStroke');
    arena.body.setCollisionGroup(arenaCollisionGroup);
    arena.body.static = true;
    arena.body.collides(puckCollisionGroup);

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

    player1 = createPlayer();
    cursors = game.input.keyboard.createCursorKeys();
    cursors.rotateRight = game.input.keyboard.addKey(Phaser.Keyboard.D);
    cursors.rotateLeft = game.input.keyboard.addKey(Phaser.Keyboard.A);
    cursors.spacebar =  game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    initiateTimer();
};

// update the game state
function update() {
    players.children.forEach(function (player) {
        // update the player and check if it is in bounds
        updatePlayer(player, cursors);
        if (!isPlayerWithinArena(player)) player.kill();
    });
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

var createPlayer = function() {
    var player = players.create(game.width / 2, game.height / 2 + 200, 'player');
    player.scale.setTo(.20, .20);
    player.body.setCircle(player.width / 2);
    player.body.addRectangle(125, 15);
    player.body.setCollisionGroup(playersCollisionGroup);
    player.body.collides([playersCollisionGroup, puckCollisionGroup]);
    player.body.debug = true;
    player.body.onBeginContact.add(function(bodyA, bodyB, shapeA, shapeB) {
        if (shapeA.constructor.name === "Circle") {
            player.body.debug = false;
            player.kill();
        }
    });
    player.body.mass = 2;
    player.body.damping = .8;
    //player.body.angularDamping = 0;
    //player.body.fixedRotation = true;
    return player;
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