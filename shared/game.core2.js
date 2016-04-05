/**
 * Created by adamcole on 4/3/16.
 */
var p2 = require('p2');
var world, boxShape, boxBody, planeBody, planeShape;


var puck;
var players = [];

var init = function() {
    // Init p2.js
    world = new p2.World({

        gravity: [0, 0]
    });

    // Add a box
    //boxShape = new p2.Box({ width: pxm(400), height: pxm(30)});
    //boxBody = new p2.Body({
    //    mass:1,
    //    position:[pxm(400),pxm(200)],
    //    angularVelocity:1
    //});
    //boxBody.addShape(boxShape);
    //world.addBody(boxBody);

    // Add a plane
    var floorBody = new p2.Body({
        mass: 0,
        position:[pxm(400),pxm(615)]
    });
    var floorShape = new p2.Box({ width: pxm(1000), height: pxm(30)});
    floorBody.addShape(floorShape);

    var rightWallBody = new p2.Body({
        mass: 0,
        position:[pxm(815),pxm(300)]
    });
    var rightWallShape = new p2.Box({ width: pxm(30), height: pxm(1000)});
    rightWallBody.addShape(rightWallShape);

    var leftWallBody = new p2.Body({
        mass: 0,
        position:[pxm(-30),pxm(300)]
    });
    var leftWallShape = new p2.Box({ width: pxm(60), height: pxm(1000)});
    leftWallBody.addShape(leftWallShape);

    var cielingBody = new p2.Body({
        mass: 0,
        position:[pxm(400),pxm(-15)]
    });
    var cielingShape = new p2.Box({ width: pxm(1000), height: pxm(60)});
    cielingBody.addShape(cielingShape);

    world.addBody(floorBody);
    world.addBody(rightWallBody);
    world.addBody(leftWallBody);
    world.addBody(cielingBody);
    createPuck();
    createPlayer();
    world.on("beginContact", function(data) {
        if (data.shapeA.type === p2.Shape.CIRCLE && data.shapeB.type === p2.Shape.CIRCLE) {
            var player = data.bodyA.gameType === 'player' ? data.bodyA : data.bodyB;
            console.log(player);
            world.removeBody(player);
            var index = players.indexOf(player);
            if (index > -1) {
                players.splice(index, 1);
            }
        }
    });
};

var createPlayer = function() {
    var playerBody = new p2.Body({
        mass:3,
        position:[pxm(400), pxm(450)],
    });
    var circleShape = new p2.Circle({
        radius: pxm(25)
    });
    var boxShape = new p2.Box({
        width: pxm(150),
        height: pxm(10)
    });
    playerBody.addShape(circleShape);
    playerBody.addShape(boxShape);
    playerBody.gameType = "player";
    world.addBody(playerBody);
    players.push(playerBody);
    console.log(playerBody);
};

var createPuck = function() {
    puck = new p2.Body({
        mass:1,
        position:[pxm(400), pxm(300)],
    });
    var circleShape = new p2.Circle({
        radius: pxm(20)
    });
    puck.gameType = "puck";
    puck.addShape(circleShape);
    world.addBody(puck);
};

/**
 * Convert pixel value to p2 physics scale (meters).
 * By default Phaser uses a scale of 20px per meter.
 * If you need to modify this you can over-ride these functions via the Physics Configuration object.
 *
 * @method Phaser.Physics.P2#pxm
 * @param {number} v - The value to convert.
 * @return {number} The scaled value.
 */
var pxm = function (v) {
    return v * 0.05;
};


module.exports = {
    world: function() {return world},
    init: init,
    boxBody: function() {return boxBody},
    boxShape: function() {return boxShape},
    planeBody:function() {return planeBody},
    planeShape:function() {return planeShape},
    players: function() {return players},
    getPuck: function() {return puck;}
};

