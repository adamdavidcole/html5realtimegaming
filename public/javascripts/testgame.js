/**
 * Created by adamcole on 2/16/16.
 */
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
var graphics;
var BACKGROUND_COLOR = '#ddd';
var playersCollisionGroup;
var arenaCollisionGroup;
var arena;
var cursors;
var wasd;
var spacebar;
var timer;

var players;
var player1;
var player2;

var moveVelocity = 100;

function preload() {
    game.load.image('player', 'images/player2.png');
    game.load.image('arena', 'images/arena.png');

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
    //  This part is vital if you want the objects with their own collision groups to still collide with the world bounds
    //  (which we do) - what this does is adjust the bounds to use its own collision group.
    game.physics.p2.updateBoundsCollisionGroup();

    playersCollisionGroup = game.physics.p2.createCollisionGroup();
    arenaCollisionGroup = game.physics.p2.createCollisionGroup();


    var arenaradius = 580/2;
    arena = game.add.sprite(game.width / 2, game.height / 2, 'arena');
    game.physics.p2.enable(arena, false);
    //arena.body.setCircle(arenaradius);
    //arena.body.static = true;
    //arena.body.data.shapes[0].sensor = true;
    //arena.body.setCollisionGroup(arenaCollisionGroup);
    //arena.body.collides(playersCollisionGroup);

    players = game.add.group();
    players.enableBody = true;
    players.physicsBodyType = Phaser.Physics.P2JS;
    player1 = createPlayer();
    player2 = createPlayer();
    //arena.body.onEndContact.add(contactEnded, arena);
    cursors = game.input.keyboard.createCursorKeys();
    wasd = {
        up: game.input.keyboard.addKey(Phaser.Keyboard.W),
        down: game.input.keyboard.addKey(Phaser.Keyboard.S),
        left: game.input.keyboard.addKey(Phaser.Keyboard.A),
        right: game.input.keyboard.addKey(Phaser.Keyboard.D),
    };
    spacebar =  game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    //  Create our Timer
    timer = game.time.create(false);

    //  Set a TimerEvent to occur after 2 seconds
    timer.loop(50, updateArenaSize, this);

    //  Start the timer running - this is important!
    //  It won't start automatically, allowing you to hook it to button events and the like.
    timer.start();
}

function update() {
    updatePlayer(player1, cursors);
    updatePlayer(player2, wasd);
    if (!isPlayerWithinArena(player1)) player1.kill();
    if (!isPlayerWithinArena(player2)) player2.kill();
}

var updatePlayer = function(player, controls) {
    //if (controls.left.isDown) {
    //    player.body.rotateLeft(100);
    //    console.log("hello");
    //} else if (controls.right.isDown) {
    //    player.body.rotateRight(100);
    //} else {
    //    player.body.setZeroRotation();
    //}
    //
    //if (controls.up.isDown) {
    //    player.body.thrust(400);
    //} else if (controls.down.isDown) {
    //    player.body.reverse(400);
    //}
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
    var player = players.create(game.width / 2, game.height / 2, 'player');
    player.scale.setTo(.20, .20);
    player.body.setCircle(player.width / 2);
    player.body.setCollisionGroup(playersCollisionGroup);

    player.body.collides([playersCollisionGroup]);
    //player.body.onEndContact.add(contactEnded, player);
    player.body.mass = 2;
    player.body.damping = .8;
    //player.body.angularDamping = 0;
    //player.body.fixedRotation = true;
    return player;
};

var contactEnded = function(bodyThisInContact, bodyThisEndedContact, shapeThatCausedContact, shapeFromContactBody) {
    console.log(bodyThisInContact);
    console.log(bodyThisEndedContact);
    console.log(shapeThatCausedContact);
    console.log(shapeFromContactBody);

    if (bodyThisInContact === arena.body) {
        //this.kill();
        console.log("contactEnded!");
    }
};

var updateArenaSize = function() {
    //arena.body.onEndContact.removeAll();
    arena.scale.multiply(.999, .999);
    //arena.body.setCircle(arena.width / 2);
    //arena.body.static = true;
    //arena.body.data.shapes[0].sensor = true;
    //arena.body.onEndContact.add(contactEnded, arena);
    //arena.body.setCollisionGroup(arenaCollisionGroup);
    //arena.body.collides(playersCollisionGroup);
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

//function drawBackground() {
    //graphics.beginFill(0x000000);
    //graphics.drawRect(0, 0, game.width, game.height);
//}
