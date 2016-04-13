/**
 * Created by adamcole on 4/3/16.
 */
var p2 = require('p2');
var world, boxShape, boxBody, planeBody, planeShape;
var inputTypes = require('./constants').inputTypes;
var bodyTypes = require('./constants').bodyTypes;

var puck;
var players = [];
var thisPlayer;
var userid;
var isServer = false;

var pxm = function (v) {
    return v * 0.05;
};

var worldWidth = 800;
var worldHeight = 800;

var moveVelocity = 10;
var rotateVelocity = 11;

var lastProcessedInput = 0;
var arenaSides = 10;
var arenaWalls = [];
var bounds = [];

var friction = .9;
var applyFrictionHorizontal = true;
var applyFrictionVertical = true;

var PLAYER_CIRCLE_GROUP = Math.pow(2,0),
    PLAYER_BOX_GROUP =  Math.pow(2,1),
    ARENA_GROUP = Math.pow(2,2),
    PUCK_GROUP = Math.pow(2,3);

var init = function(_userid) {
    var initialArenaSize = 1;

    if (!_userid) isServer = true;
    else userid = _userid;

    // Init p2.js
    world = new p2.World({
        gravity: [0, 0]
    });

    //createBounds();
    createPuck();
    createArena();
    world.on("beginContact", function(data) {
        if (data.shapeA.type === p2.Shape.CIRCLE && data.shapeB.type === p2.Shape.CIRCLE) {
            if (data.bodyA.bodyType !== bodyTypes.PUCK &&
                data.bodyB.bodyType !== bodyTypes.PUCK) return;
            var nonPuckBody = data.bodyA.bodyType === bodyTypes.PUCK ? data.bodyB : data.bodyA;
            if (nonPuckBody.bodyType === bodyTypes.PLAYER) removePlayer(nonPuckBody);
        }
    });
    world.on("postStep", applyFriction);
    //world.defaultContactMaterial.friction = 50;
    world.defaultContactMaterial.restitution = .5;
};

var createBounds = function() {
    var planeLength = 4000;
    var planeThickness = 30;
    // Add a plane
    var floorBody = new p2.Body({
        mass: 0,
        position:[pxm(worldWidth/2),pxm(worldHeight/2 + planeThickness / 2)]
    });
    var floorShape = new p2.Box({ width: pxm(planeLength), height: pxm(planeThickness), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    floorBody.addShape(floorShape);

    var rightWallBody = new p2.Body({
        mass: 0,
        position:[pxm(worldWidth/2 + planeThickness/2),pxm(worldHeight/2)]
    });
    var rightWallShape = new p2.Box({ width: pxm(planeThickness), height: pxm(planeLength), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    rightWallBody.addShape(rightWallShape);

    var leftWallBody = new p2.Body({
        mass: 0,
        position:[pxm(-1 * (worldWidth/2) - (planeThickness/2)),pxm(worldHeight/2)]
    });
    var leftWallShape = new p2.Box({ width: pxm(planeThickness), height: pxm(planeLength), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    leftWallBody.addShape(leftWallShape);

    var cielingBody = new p2.Body({
        mass: 0,
        position:[pxm(worldWidth/2),pxm(-worldHeight/2 - planeThickness/2)]
    });
    var cielingShape = new p2.Box({ width: pxm(planeLength), height: pxm(planeThickness), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    cielingBody.addShape(cielingShape);

    world.addBody(floorBody);
    world.addBody(rightWallBody);
    world.addBody(leftWallBody);
    world.addBody(cielingBody);
};

var createPlayer = function(_userid, x, y) {
    if (!x || !y) {
        x = 0;
        y = 0;
    }
    var playerBody = new p2.Body({
        mass:500,
        position:[pxm(x), pxm(y)],
    });
    var circleShape = new p2.Circle({
        radius: pxm(25),
        collisionGroup: PLAYER_CIRCLE_GROUP,
        collisionMask: PLAYER_BOX_GROUP | ARENA_GROUP | PUCK_GROUP | PLAYER_CIRCLE_GROUP
    });
    var boxShape = new p2.Box({
        width: pxm(165),
        height: pxm(15),
        collisionGroup: PLAYER_BOX_GROUP,
        collisionMask: PUCK_GROUP
    });
    playerBody.addShape(circleShape);
    playerBody.addShape(boxShape);
    playerBody.bodyType = bodyTypes.PLAYER;
    playerBody.userid = _userid;
    world.addBody(playerBody);
    players.push(playerBody);
    if (userid === _userid) thisPlayer = playerBody;
    return playerBody;
};

var createPuck = function() {
    puck = new p2.Body({
        mass:1,
        position:[pxm(50), pxm(100)],
    });
    var circleShape = new p2.Circle({
        radius: pxm(20),
        collisionGroup: PUCK_GROUP,
        collisionMask: ARENA_GROUP | PLAYER_BOX_GROUP | PLAYER_CIRCLE_GROUP
    });
    puck.bodyType = bodyTypes.PUCK;
    puck.addShape(circleShape);
    world.addBody(puck);
    return puck;
};

var getSideDistance = function(r) {
    var angle = (2*Math.PI/arenaSides);
    var x = r * Math.cos(0);
    var y = r * Math.sin(0);
    var xnext = r * Math.cos(angle);
    var ynext = r * Math.sin(angle);
    return Math.sqrt((xnext-x)*(xnext-x) + (ynext-y)*(ynext-y));
};

var createArena = function() {
    var N = arenaSides;
    var r = pxm(Math.min(worldWidth,worldHeight)/2);
    var x_centre = pxm(0);
    var y_centre = pxm(0);
    var theta = 0;
    var angle = (2*Math.PI) / N;
    var sideLength = getSideDistance(r)+2;
    var sideHeight = pxm(40);
    for (var n = 0; n < N; n++) {
        var x = r * Math.cos(angle * n + theta) + x_centre;
        var y = r * Math.sin(angle * n + theta) + y_centre;
        var xnext = r * Math.cos(angle * (n+1) + theta) + x_centre;
        var ynext = r * Math.sin(angle * (n+1) + theta) + y_centre;
        var midx = (x+xnext)/2;
        var midy = (y+ynext)/2;
        var body = new p2.Body({
            mass: 0,
            position: [midx,midy],
            angle: (-1 * (Math.PI - angle)/2) + angle*n
        });
        body.bodyType = bodyTypes.ARENA;
        var side = new p2.Box({
            width: sideLength,
            height: sideHeight,
            collisionGroup: ARENA_GROUP,
            collisionMask: PUCK_GROUP | PLAYER_CIRCLE_GROUP,
        });
        body.addShape(side);
        world.addBody(body);
        arenaWalls.push(body);
    }
};

var removePlayerById = function(playerid) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].userid === playerid) removePlayer(players[i]);
    }
};

var removePlayer = function(player) {
    world.removeBody(player);
    var index = players.indexOf(player);
    if (index > -1) {
        players.splice(index, 1);
    }
};

var getPlayer = function(userid) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].userid === userid) return players[i];
    }
    return;
};

var processInput = function(inputs, userid) {
    var player = getPlayer(userid);
    if (!player) return;
    var damp = 1;
    inputs.forEach(function(input) {
        switch(input) {
            case inputTypes.MOVE_RIGHT:
                player.velocity[0] = moveVelocity;
                applyFrictionHorizontal = false;
                break;
            case inputTypes.MOVE_LEFT:
                player.velocity[0] = moveVelocity * -1;
                applyFrictionHorizontal = false;
                break;
            case inputTypes.MOVE_UP:
                player.velocity[1] = moveVelocity * -1;
                applyFrictionVertical = false;
                break;
            case inputTypes.MOVE_DOWN:
                player.velocity[1] = moveVelocity;
                applyFrictionVertical = false;
                break;
            case inputTypes.ROTATE_LEFT:
                player.angularVelocity = rotateVelocity * -1;
                break;
            case inputTypes.ROTATE_RIGHT:
                player.angularVelocity = rotateVelocity;
                break;
            case inputTypes.STOP_RIGHT:
                if (player.velocity[0] > 0) player.velocity[0] = moveVelocity * damp;
                applyFrictionHorizontal = true;
                break;
            case inputTypes.STOP_LEFT:
                if (player.velocity[0] < 0) player.velocity[0] = moveVelocity * -1 * damp;
                applyFrictionHorizontal = true;
                break;
            case inputTypes.STOP_UP:
                if (player.velocity[1] < 0) player.velocity[1] = moveVelocity * -1 * damp;
                applyFrictionVertical = true;
                break;
            case inputTypes.STOP_DOWN:
                if (player.velocity[1] > 0) player.velocity[1] = moveVelocity * damp;
                applyFrictionVertical = true;
                break;
            case inputTypes.STOP_ROTATE_RIGHT:
                if (player.angularVelocity > 0) player.angularVelocity = 0;
                break;
            case inputTypes.STOP_ROTATE_LEFT:
                if (player.angularVelocity < 0) player.angularVelocity = 0;
                break;
            default :
                player.velocity = [0,0];
                player.angularVelocity = 0;
        }
    });
};

var applyFriction = function() {
    var friction = .9;
    players.forEach(function(player) {
        if (applyFrictionHorizontal) player.velocity[0] = player.velocity[0] * friction;
        if (applyFrictionVertical) player.velocity[1] = player.velocity[1] * friction;
    });
};

var serializeBody = function(body) {
    sBody = {};
    sBody.angle = body.angle;
    sBody.interpolatedAngle = body.interpolatedAngle;
    sBody.angularDamping = body.angularDamping;
    sBody.angularForce = body.angularForce;
    sBody.angularVelocity = body.angularVelocity;
    sBody.damping = body.damping;
    sBody.inertia = body.inertia;
    sBody.invInertia = body.invInertia;
    sBody.force = [body.force[0], body.force[1]];
    sBody.position = [body.position[0], body.position[1]];
    sBody.velocity = [body.velocity[0], body.velocity[1]];
    sBody.interpolatedPosition = [body.interpolatedPosition[0], body.interpolatedPosition[1]];
    sBody.vlambda = [body.vlambda[0], body.vlambda[1]]
    sBody.wlambda = body.wlambda;
    sBody.userid = body.userid;
    sBody.bodyType = body.bodyType;
    return sBody;
};

var getGameState = function() {
    var state = {};
    state.puck = serializeBody(puck);
    state.players = [];
    players.forEach(function (player) {
        var sBody = serializeBody(player);
        state.players.push(sBody);
    });
    return state;
};

// CLIENT FUNCTION
var applyState = function(state) {
    applyStateToBody(state.puck, puck);
    state.players.forEach(function (playerState) {
        var playerBody = getPlayer(playerState.userid);
        if (!playerBody) playerBody = createPlayer(playerState.userid);
        applyStateToBody(playerState, playerBody);
    });
};

var applyStateToBody = function(sBody, body) {
    body.angle = sBody.angle;
    //body.interpolatedAngle = sBody.interpolatedAngle;
    body.angularDamping = sBody.angularDamping;
    body.angularForce = sBody.angularForce;
    body.angularVelocity = sBody.angularVelocity;
    body.damping = sBody.damping;
    body.inertia = sBody.inertia;
    body.invInertia = sBody.invInertia;
    body.force = [sBody.force[0], sBody.force[1]];
    body.position = [sBody.position[0], sBody.position[1]];
    //body.interpolatedPosition = [sBody.interpolatedPosition[0], body.interpolatedPosition[1]];
    body.velocity = [sBody.velocity[0], sBody.velocity[1]];
    body.vlambda = [sBody.vlambda[0], sBody.vlambda[1]]
    body.wlambda = sBody.wlambda;
    body.userid = sBody.userid;
    body.bodyType = sBody.bodyType;
};

module.exports = {
    getWorld: function() {return world;},
    getPlayers: function() {return players;},
    getThisPlayer: function() {return thisPlayer;},
    getPuck: function() {return puck;},
    getArenaWalls: function() {return arenaWalls;},
    getLastProcessedInput: function(){return lastProcessedInput},
    getUserId: function() {return userid;},
    setUserId: function(_userid) {userid = _userid;},
    init: init,
    getGameState: getGameState,
    createPlayer: createPlayer,
    removePlayer: removePlayer,
    removePlayerById: removePlayerById,
    processInput: processInput,
    applyState: applyState
};

