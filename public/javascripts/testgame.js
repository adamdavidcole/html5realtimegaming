/**
 * Created by adamcole on 2/16/16.
 */
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
var graphics;
var BACKGROUND_COLOR = '#ddd';
var playersCollisionGroup;
var arenaCollisionGroup;
var players;
var player;
var arenaGroup;
var arena;
var cursors;

var moveVelocity = 200;

function preload() {
    game.load.image('player', 'images/player.png');
    game.load.image('arena', 'images/arena.png');

    game.stage.backgroundColor = BACKGROUND_COLOR;
}

function create() {
    //  Enable P2
    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.restitution = 0.8;
    //  Turn on impact events for the world, without this we get no collision callbacks
    game.physics.p2.setImpactEvents(true);
    //  This part is vital if you want the objects with their own collision groups to still collide with the world bounds
    //  (which we do) - what this does is adjust the bounds to use its own collision group.
    game.physics.p2.updateBoundsCollisionGroup();

    playersCollisionGroup = game.physics.p2.createCollisionGroup();
    var arenaCollisionGroup = game.physics.p2.createCollisionGroup();


    var arenaradius = 580/2;
    arena = game.add.sprite(game.width / 2, game.height / 2, 'arena');
    game.physics.p2.enable(arena, true);
    arena.body.setCircle(arenaradius);
    arena.body.static = true;
    arena.body.data.shapes[0].sensor = true;
    arena.body.setCollisionGroup(arenaCollisionGroup);
    arena.body.collides(playersCollisionGroup);

    players = game.add.group();
    players.enableBody = true;
    players.physicsBodyType = Phaser.Physics.P2JS;
    for (var i = 0; i < 4; i++) {
        player = players.create(game.width / 2, game.height / 2, 'player');
        player.scale.setTo(.20, .20);
        player.body.setCircle(player.width / 2);
        player.body.setCollisionGroup(playersCollisionGroup);

        player.body.collides([playersCollisionGroup, arenaCollisionGroup]);
        player.body.onEndContact.add(contactEnded, player);

        player.body.damping = .9;
    }


    //game.physics.p2.enable(arena, true);
    //arena.body.static = true;
    //arena.body.setCircle(580);
    //arena.body.data.shapes[0].sensor = true;

    cursors = game.input.keyboard.createCursorKeys();
}

function update() {
    //player.body.setZeroVelocity();

    if (cursors.left.isDown)
    {
        player.body.moveLeft(moveVelocity);
    }
    else if (cursors.right.isDown)
    {
        player.body.moveRight(moveVelocity);
    }

    if (cursors.up.isDown)
    {
        player.body.moveUp(moveVelocity);
    }
    else if (cursors.down.isDown)
    {
        player.body.moveDown(moveVelocity);
    }
}

var contactEnded = function(bodyThisInContact, bodyThisEndedContact, shapeThatCausedContact, shapeFromContactBody) {
    // check if ended contact with arena body
    console.log(bodyThisInContact === arena.body);
    console.log(bodyThisEndedContact);
    if (bodyThisInContact === arena.body) {
        this.kill();
        console.log("contactEnded!");
    }
};

//function drawBackground() {
    //graphics.beginFill(0x000000);
    //graphics.drawRect(0, 0, game.width, game.height);
//}
