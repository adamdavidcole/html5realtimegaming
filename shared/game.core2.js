/**
 * Created by adamcole on 4/3/16.
 */
var p2 = require('p2');
var world, boxShape, boxBody, planeBody, planeShape;
var inputTypes = require('./constants').inputTypes;
var bodyTypes = require('./constants').bodyTypes;

var puck;
var players = [];
var userid;
var isServer = false;

var pxm = function (v) {
    return v * 0.05;
};
var moveVelocity = 10;
var rotateVelocity = 12;

var lastProcessedInput = 0;
var arenaSides = 4;
var arenaWalls = [];

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

    // Add a plane
    var floorBody = new p2.Body({
        mass: 0,
        position:[pxm(400),pxm(615)]
    });
    var floorShape = new p2.Box({ width: pxm(1000), height: pxm(30), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    floorBody.addShape(floorShape);

    var rightWallBody = new p2.Body({
        mass: 0,
        position:[pxm(815),pxm(300)]
    });
    var rightWallShape = new p2.Box({ width: pxm(30), height: pxm(1000), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    rightWallBody.addShape(rightWallShape);

    var leftWallBody = new p2.Body({
        mass: 0,
        position:[pxm(-30),pxm(300)]
    });
    var leftWallShape = new p2.Box({ width: pxm(60), height: pxm(1000), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    leftWallBody.addShape(leftWallShape);

    var cielingBody = new p2.Body({
        mass: 0,
        position:[pxm(400),pxm(-15)]
    });
    var cielingShape = new p2.Box({ width: pxm(1000), height: pxm(60), collisionGroup: ARENA_GROUP, collisionMask: PLAYER_CIRCLE_GROUP | PUCK_GROUP});
    cielingBody.addShape(cielingShape);

    world.addBody(floorBody);
    world.addBody(rightWallBody);
    world.addBody(leftWallBody);
    world.addBody(cielingBody);
    createPuck();
    createArena(initialArenaSize);
    world.on("beginContact", function(data) {
        if (data.shapeA.type === p2.Shape.CIRCLE && data.shapeB.type === p2.Shape.CIRCLE) {
            if (data.bodyA.bodyType !== bodyTypes.PUCK &&
                data.bodyB.bodyType !== bodyTypes.PUCK) return;
            var nonPuckBody = data.bodyA.bodyType === bodyTypes.PUCK ? data.bodyB : data.bodyA;
            if (nonPuckBody.bodyType === bodyTypes.PLAYER) removePlayer(nonPuckBody);
        }
    });
};

var createPlayer = function(userid, x, y) {
    if (!x || !y) {
        x = 400;
        y = 300;
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
        width: pxm(155),
        height: pxm(15),
        collisionGroup: PLAYER_BOX_GROUP,
        collisionMask: PUCK_GROUP
    });
    playerBody.addShape(circleShape);
    playerBody.addShape(boxShape);
    playerBody.bodyType = bodyTypes.PLAYER;
    playerBody.userid = userid;
    world.addBody(playerBody);
    players.push(playerBody);
    return playerBody;
};

var createPuck = function() {
    puck = new p2.Body({
        mass:1,
        position:[pxm(450), pxm(200)],
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

var getSideDistance = function(scale) {
    var angle = (2*Math.PI/arenaSides);
    var x1 = Math.cos(angle) * scale;
    var y1 = Math.sin(angle) * scale;
    var x2 = Math.cos(angle*2) * scale;
    var y2 = Math.sin(angle*2) * scale;
    var d = Math.sqrt( (x1-x2)*(x1-x2) + (y1-y2)*(y1-y2) );
    return d;
};

var createArena = function(scale) {
    var N = 150;
    var r = pxm(500);
    var x_centre = pxm(400);
    var y_centre = pxm(300);
    var theta = Math.PI/4;
    for (var n = 0; n < N; n++) {
        var xprev = r * Math.cos(2*Math.PI*(n-1)/N + theta) + x_centre;
        var yprev = r * Math.sin(2*Math.PI*(n-1)/N + theta) + y_centre;
        var x = r * Math.cos(2*Math.PI*n/N + theta) + x_centre;
        var y = r * Math.sin(2*Math.PI*n/N + theta) + y_centre
        var midx = (x+xprev)/2;
        var midy = (y+yprev)/2;
        var body = new p2.Body({
            mass: 0,
            position: [midx,midy],
            angle: 2*Math.PI*(n-1)/N
        });
        body.bodyType = bodyTypes.ARENA;
        var length = Math.sqrt((x-xprev)*(x-xprev) + (y-yprev)*(y-yprev));
        var side = new p2.Box({
            width: length + 15,
            height: pxm(20),
            collisionGroup: ARENA_GROUP,
            collisionMask: PUCK_GROUP | PLAYER_CIRCLE_GROUP
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
    inputs.forEach(function(input) {
        switch(input) {
            case inputTypes.MOVE_RIGHT:
                player.velocity[0] = moveVelocity;
                break;
            case inputTypes.MOVE_LEFT:
                player.velocity[0] = moveVelocity * -1;
                break;
            case inputTypes.MOVE_UP:
                player.velocity[1] = moveVelocity * -1;
                break;
            case inputTypes.MOVE_DOWN:
                player.velocity[1] = moveVelocity;
                break;
            case inputTypes.ROTATE_LEFT:
                player.angularVelocity = rotateVelocity * -1;
                break;
            case inputTypes.ROTATE_RIGHT:
                player.angularVelocity = rotateVelocity;
                break;
            case inputTypes.STOP_RIGHT:
                if (player.velocity[0] > 0) player.velocity[0] = 0;
                break;
            case inputTypes.STOP_LEFT:
                if (player.velocity[0] < 0) player.velocity[0] = 0;
                break;
            case inputTypes.STOP_UP:
                if (player.velocity[1] < 0) player.velocity[1] = 0;
                break;
            case inputTypes.STOP_DOWN:
                if (player.velocity[1] > 0) player.velocity[1] = 0;
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

var serializeBody = function(body) {
    sBody = {};
    sBody.angle = body.angle;
    sBody.angularDamping = body.angularDamping;
    sBody.angularForce = body.angularForce;
    sBody.angularVelocity = body.angularVelocity;
    sBody.damping = body.damping;
    sBody.inertia = body.inertia;
    sBody.invInertia = body.invInertia;
    sBody.force = [body.force[0], body.force[1]];
    sBody.position = [body.position[0], body.position[1]];
    sBody.velocity = [body.velocity[0], body.velocity[1]];
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
    body.angularDamping = sBody.angularDamping;
    body.angularForce = sBody.angularForce;
    body.angularVelocity = sBody.angularVelocity;
    body.damping = sBody.damping;
    body.inertia = sBody.inertia;
    body.invInertia = sBody.invInertia;
    body.force = [sBody.force[0], sBody.force[1]];
    body.position = [sBody.position[0], sBody.position[1]];
    body.velocity = [sBody.velocity[0], sBody.velocity[1]];
    body.vlambda = [sBody.vlambda[0], sBody.vlambda[1]]
    body.wlambda = sBody.wlambda;
    body.userid = sBody.userid;
    body.bodyType = sBody.bodyType;
};

module.exports = {
    getWorld: function() {return world;},
    getPlayers: function() {return players;},
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

