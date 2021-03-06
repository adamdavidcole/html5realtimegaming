/**
 * Created by adamcole on 4/3/16.
 */
var p2 = require('p2');
var inputTypes = require('./constants').inputTypes;
var bodyTypes = require('./constants').bodyTypes;
var playerStatus = require('./constants').playerStatus;


var Game = function() {
    var world, boxShape, boxBody, planeBody, planeShape;
    var puck;
    var players = [];
    var thisPlayer;
    var userid;
    var isServer = false;

    var lastProcessedInput = 0;
    var arenaSides = 10;
    var arenaWalls = [];
    var bounds = [];
    var endpoints = [];

    var friction = .9;
    var applyFrictionHorizontal = true;
    var applyFrictionVertical = true;
};

var pxm = function (v) {
    return v * 0.05;
};

var worldWidth = 900;
var worldHeight = 900;

var moveVelocity = 200;
var rotateVelocity = 215;

var PLAYER_CIRCLE_GROUP = Math.pow(2,0),
    PLAYER_BOX_GROUP =  Math.pow(2,1),
    ARENA_GROUP = Math.pow(2,2),
    PUCK_GROUP = Math.pow(2,3);

var init = function(_userid) {
    var initialArenaSize = 1;

    if (!_userid) this.isServer = true;
    else this.userid = _userid;

    // Init p2.js
    this.world = new p2.World({
        gravity: [0, 0]
    });

    //createBounds();
    createPuck();
    createArena();
    this.world.on("beginContact", function(data) {
        //if (data.bodyA.bodyType === bodyTypes.PLAYER) setVelocity(data.bodyA);
        //if (data.bodyB.bodyType === bodyTypes.PLAYER) setVelocity(data.bodyB);
        if (data.shapeA.type === p2.Shape.CIRCLE && data.shapeB.type === p2.Shape.CIRCLE) {
            if (data.bodyA.bodyType !== bodyTypes.PUCK &&
                data.bodyB.bodyType !== bodyTypes.PUCK) return;
            var nonPuckBody = data.bodyA.bodyType === bodyTypes.PUCK ? data.bodyB : data.bodyA;
            if (nonPuckBody.bodyType === bodyTypes.PLAYER) {
                removePlayer(nonPuckBody);
            }
        }
    });

    this.world.on("postStep", applyFriction);
    this.world.defaultContactMaterial.friction = 50;
    this.world.defaultContactMaterial.restitution = .5;
};
//
var setVelocity = function(body) {
    body.velocity[0] = (body.position[0] - body.previousPosition[0]) / body.dtSec;
    body.velocity[1] = (body.position[1] - body.previousPosition[1]) / body.dtSec;
    body.angularVelocity = (body.angle - body.previousAngle) / body.dtSec;
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

    this.world.addBody(floorBody);
    this.world.addBody(rightWallBody);
    this.world.addBody(leftWallBody);
    this.world.addBody(cielingBody);
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
        width: pxm(180),
        height: pxm(18.5),
        collisionGroup: PLAYER_BOX_GROUP,
        collisionMask: PUCK_GROUP
    });
    playerBody.addShape(circleShape);
    playerBody.addShape(boxShape);
    playerBody.bodyType = bodyTypes.PLAYER;
    playerBody.playerStatus = playerStatus.ACTIVE;
    playerBody.userid = _userid;
    this.world.addBody(playerBody);
    this.players.push(playerBody);
    if (userid === _userid) this.thisPlayer = playerBody;
    return playerBody;
};

var createPuck = function() {
    console.log(this.world);
    this.puck = new p2.Body({
        mass:1,
        position:[pxm(50), pxm(100)],
    });
    var circleShape = new p2.Circle({
        radius: pxm(20),
        collisionGroup: PUCK_GROUP,
        collisionMask: ARENA_GROUP | PLAYER_BOX_GROUP | PLAYER_CIRCLE_GROUP
    });
    this.puck.bodyType = bodyTypes.PUCK;
    this.puck.addShape(circleShape);
    this.world.addBody(this.puck);
    return this.puck;
};

var getSideDistance = function(r) {
    var angle = (2*Math.PI/this.arenaSides);
    var x = r * Math.cos(0);
    var y = r * Math.sin(0);
    var xnext = r * Math.cos(angle);
    var ynext = r * Math.sin(angle);
    return Math.sqrt((xnext-x)*(xnext-x) + (ynext-y)*(ynext-y));
};

var createArena = function() {
    var N = this.arenaSides;
    var r = pxm(Math.min(worldWidth,worldHeight)/2);
    var x_centre = pxm(0);
    var y_centre = pxm(0);
    var theta = 0;
    var angle = (2*Math.PI) / N;
    var sideLength = getSideDistance(r)+2;
    var sideHeight = pxm(30);
    var endpointRadius = pxm(45);
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

        var endpointBody = new p2.Body({
            mass: 0,
            position: [x, y]
        });
        var endpointCirlce = new p2.Circle({
            radius: endpointRadius,
            collisionGroup: ARENA_GROUP,
            collisionMask: PUCK_GROUP | PLAYER_CIRCLE_GROUP
        });
        endpointBody.addShape(endpointCirlce);
        this.world.addBody(body);
        this.world.addBody(endpointBody);
        this.arenaWalls.push(body);
        this.endpoints.push(endpointBody);
    }
};

var removePlayerById = function(playerid) {
    for (var i = 0; i < players.length; i++) {
        if (this.players[i].userid === playerid) removePlayer(this.players[i]);
    }
};

var removePlayer = function(player) {
    this.world.removeBody(player);
    //var index = players.indexOf(player);
    //if (index > -1) {
    //    players.splice(index, 1);
    //}
    player.playerStatus = playerStatus.DEAD;
};

var getPlayer = function(userid) {
    for (var i = 0; i < players.length; i++) {
        if (this.players[i].userid === userid) return this.players[i];
    }
    return;
};

var moveRightTimeout, moveLeftTimeout, moveUpTimeout, moveDownTimeout;

var processInput = function(inputs, userid, dtSec) {
    var moveByPosition = false;
    var player = getPlayer(userid);
    if (!player) return;
    player.dtSec = dtSec;
    inputs.forEach(function(input) {
        switch(input) {
            case inputTypes.MOVE_RIGHT:
                if (moveByPosition) player.position[0] = player.position[0] + (pxm(moveVelocity) * dtSec);
                else player.velocity[0] = pxm(moveVelocity);
                this.applyFrictionHorizontal = false;
                break;
            case inputTypes.MOVE_LEFT:
                if (moveByPosition) player.position[0] = player.position[0] - (pxm(moveVelocity) * dtSec);
                else player.velocity[0] =  -1 * pxm(moveVelocity);
                this.applyFrictionHorizontal = false;
                break;
            case inputTypes.MOVE_UP:
                if (moveByPosition) player.position[1] = player.position[1] - (pxm(moveVelocity) * dtSec);
                else player.velocity[1] = -1 * pxm(moveVelocity);
                this.applyFrictionVertical = false;
                break;
            case inputTypes.MOVE_DOWN:
                if (moveByPosition) player.position[1] = player.position[1] + (pxm(moveVelocity) * dtSec);
                else player.velocity[1] = pxm(moveVelocity);
                this.applyFrictionVertical = false;
                break;
            case inputTypes.ROTATE_LEFT:
                if (moveByPosition) player.angle =  player.angle + (pxm(rotateVelocity) * dtSec);
                else player.angularVelocity = pxm(rotateVelocity);
                break;
            case inputTypes.ROTATE_RIGHT:
                if (moveByPosition)player.angle = player.angle - (pxm(rotateVelocity) * dtSec);
                else player.angularVelocity = pxm(rotateVelocity) * -1;
                break;
            //case inputTypes.STOP_RIGHT:
            //    console.log("STOPRIGHT?");
            //    if (player.velocity[0] > 0) player.velocity[0] = 0;
            //    applyFrictionHorizontal = true;
            //    break;
            //case inputTypes.STOP_LEFT:
            //    if (player.velocity[0] < 0) player.velocity[0] = 0;
            //    applyFrictionHorizontal = true;
            //    break;
            //case inputTypes.STOP_UP:
            //    if (player.velocity[1] < 0) player.velocity[1] = moveVelocity * -1 * damp;
            //    applyFrictionVertical = true;
            //    break;
            //case inputTypes.STOP_DOWN:
            //    if (player.velocity[1] > 0) player.velocity[1] = moveVelocity * damp;
            //    applyFrictionVertical = true;
            //    break;
            //case inputTypes.STOP_ROTATE_RIGHT:
            //    if (player.angularVelocity > 0) player.angularVelocity = 0;
            //    break;
            //case inputTypes.STOP_ROTATE_LEFT:
            //    if (player.angularVelocity < 0) player.angularVelocity = 0;
            //    break;
            default :
                player.velocity = [0,0];
                player.angularVelocity = 0;
        }
    });
    //console.log(player.position);
};

var applyFriction = function() {
    var friction = .9;
    this.players.forEach(function(player) {
        if (this.applyFrictionHorizontal) player.velocity[0] = player.velocity[0] * friction;
        if (this.applyFrictionVertical) player.velocity[1] = player.velocity[1] * friction;
    });
};

var serializeBody = function(body) {
    var sBody = {};
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
    sBody.vlambda = [body.vlambda[0], body.vlambda[1]];
    sBody.wlambda = body.wlambda;
    sBody.userid = body.userid;
    sBody.bodyType = body.bodyType;
    if (body.bodyType === bodyTypes.PLAYER) {
        sBody.playerStatus = body.playerStatus;
    }
    return sBody;
};

var getGameState = function() {
    var state = {};
    state.puck = serializeBody(this.puck);
    state.players = [];
    this.players.forEach(function (player) {
        var sBody = serializeBody(player);
        state.players.push(sBody);
    });
    return state;
};

// CLIENT FUNCTION
var applyState = function(state) {
    applyStateToBody(state.puck, this.puck);
    state.players.forEach(function (playerState) {
        var playerBody = getPlayer(playerState.userid);
        if (!playerBody) playerBody = createPlayer(playerState.userid);
        applyStateToBody(playerState, playerBody);
    });
};

//var sleepBodies =

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
    if (body.bodyType === bodyTypes.PLAYER) {
        body.playerStatus = sBody.playerStatus;
    }
};

Game.prototype.getWorld = function() {return world;};
Game.prototype.getPlayers = function() {return players;};
Game.prototype.getThisPlayer =  function() {return thisPlayer;};
Game.prototype.getPuck = function() {return puck;};
Game.prototype.getArenaWalls = function() {return arenaWalls;};
Game.prototype.getEndpoints = function() {return endpoints;};
Game.prototype.getLastProcessedInput = function(){return lastProcessedInput};
Game.prototype.getUserId = function() {return userid;};
Game.prototype.setUserId = function(_userid) {userid = _userid;};
Game.prototype.init = init;
Game.prototype.getGameState = getGameState;
Game.prototype.createPlayer = createPlayer;
Game.prototype.removePlayer = removePlayer;
Game.prototype.removePlayerById = removePlayerById;
Game.prototype.processInput = processInput;
Game.prototype.applyState = applyState;