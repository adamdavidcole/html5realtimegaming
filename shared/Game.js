/**
 * Created by adamcole on 5/4/16.
 */
var p2 = require('p2');
var inputTypes = require('./constants').inputTypes;
var bodyTypes = require('./constants').bodyTypes;
var playerStatus = require('./constants').playerStatus;
var gameStatus = require('./constants').gameStatus;

var worldWidth = 900;
var worldHeight = 900;

var moveVelocity = 200;
var rotateVelocity = 215;

var PLAYER_CIRCLE_GROUP = Math.pow(2,0),
    PLAYER_BOX_GROUP =  Math.pow(2,1),
    ARENA_GROUP = Math.pow(2,2),
    PUCK_GROUP = Math.pow(2,3);

var Game = function(roomid, hostid, userid) {
    this.roomid = roomid;
    this.hostid = hostid;

    if (!userid) this.isServer = true;
    else {
        this.isServer = false;
        this.userid = userid;
    }

    this.world = new p2.World({
        gravity: [0, 0]
    });

    this.createPuck();

    this.arenaSides = 10;
    this.arenaWalls = [];
    this.bounds = [];
    this.endpoints = [];
    this.createArena();
    this.alivePlayerCount = 0;
    this.players = [];
    this.deadPlayers =[];

    var that = this;
    this.world.on("beginContact", function(data) {
        //if (data.bodyA.bodyType === bodyTypes.PLAYER) setVelocity(data.bodyA);
        //if (data.bodyB.bodyType === bodyTypes.PLAYER) setVelocity(data.bodyB);
        if (data.shapeA.type === p2.Shape.CIRCLE && data.shapeB.type === p2.Shape.CIRCLE) {
            if (data.bodyA.bodyType !== bodyTypes.PUCK &&
                data.bodyB.bodyType !== bodyTypes.PUCK) return;
            var nonPuckBody = data.bodyA.bodyType === bodyTypes.PUCK ? data.bodyB : data.bodyA;
            if (nonPuckBody.bodyType === bodyTypes.PLAYER && nonPuckBody.playerStatus === playerStatus.ALIVE) {
                that.removePlayer(nonPuckBody);
            }
        }
    });

    this.world.defaultContactMaterial.friction = 50;
    this.world.defaultContactMaterial.restitution = .5;
};

var pxm = function (v) {
    return v * 0.05;
};

Game.prototype.createPuck = function() {
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


Game.prototype.createPlayer = function(_userid, x, y) {
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
    playerBody.playerStatus = playerStatus.IDLE;
    playerBody.userid = _userid;
    if (!(this.gameStatus === gameStatus.PLAY)) this.world.addBody(playerBody);
    this.players.push(playerBody);
    if (this.userid === _userid) this.thisPlayer = playerBody;
    return playerBody;
};

Game.prototype.getSideDistance = function(r) {
    var angle = (2*Math.PI/this.arenaSides);
    var x = r * Math.cos(0);
    var y = r * Math.sin(0);
    var xnext = r * Math.cos(angle);
    var ynext = r * Math.sin(angle);
    return Math.sqrt((xnext-x)*(xnext-x) + (ynext-y)*(ynext-y));
};

Game.prototype.createArena = function() {
    var N = this.arenaSides;
    var r = pxm(Math.min(worldWidth,worldHeight)/2);
    var x_centre = pxm(0);
    var y_centre = pxm(0);
    var theta = 0;
    var angle = (2*Math.PI) / N;
    var sideLength = this.getSideDistance(r)+2;
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
        var endpointCircle = new p2.Circle({
            radius: endpointRadius,
            collisionGroup: ARENA_GROUP,
            collisionMask: PUCK_GROUP | PLAYER_CIRCLE_GROUP
        });
        endpointBody.addShape(endpointCircle);
        this.world.addBody(body);
        this.world.addBody(endpointBody);
        this.arenaWalls.push(body);
        this.endpoints.push(endpointBody);
    }
};

Game.prototype.removePlayerById = function(playerid) {
    for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].userid === playerid) {
            this.removePlayer(this.players[i]);
        }
    }
};

Game.prototype.removePlayer = function(player) {
    this.world.removeBody(player);
    //var index = players.indexOf(player);
    //if (index > -1) {
    //    players.splice(index, 1);
    //}
    if (player.playerStatus === playerStatus.ALIVE) this.alivePlayerCount--;
    this.deadPlayers.push(player.userid);
    player.playerStatus = playerStatus.DEAD;
};

Game.prototype.removePlayerFromRoom = function(playerid) {
    var player = this.getPlayer(playerid)
    if (player) {
        this.world.removeBody(player);
        if (player.playerStatus === playerStatus.ALIVE) this.alivePlayerCount--;
        var index = this.players.indexOf(player);
        if (index != -1) {
            console.log('remove player from players array');
            this.players.splice(index, 1);
        }
    }
};

Game.prototype.getPlayer = function(userid) {
    for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].userid === userid) return this.players[i];
    }
    return;
};

Game.prototype.processInput = function(inputs, userid, dtSec) {
    var moveByPosition = false;
    var player = this.getPlayer(userid);
    if (!player) return;
    player.dtSec = dtSec;
    inputs.forEach(function(input) {
        switch(input) {
            case inputTypes.MOVE_RIGHT:
                if (moveByPosition) player.position[0] = player.position[0] + (pxm(moveVelocity) * dtSec);
                else player.velocity[0] = pxm(moveVelocity);
                //this.applyFrictionHorizontal = false;
                break;
            case inputTypes.MOVE_LEFT:
                if (moveByPosition) player.position[0] = player.position[0] - (pxm(moveVelocity) * dtSec);
                else player.velocity[0] =  -1 * pxm(moveVelocity);
                //this.applyFrictionHorizontal = false;
                break;
            case inputTypes.MOVE_UP:
                if (moveByPosition) player.position[1] = player.position[1] - (pxm(moveVelocity) * dtSec);
                else player.velocity[1] = -1 * pxm(moveVelocity);
                //this.applyFrictionVertical = false;
                break;
            case inputTypes.MOVE_DOWN:
                if (moveByPosition) player.position[1] = player.position[1] + (pxm(moveVelocity) * dtSec);
                else player.velocity[1] = pxm(moveVelocity);
                //this.applyFrictionVertical = false;
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
    // console.log(player.position);
};

Game.prototype.serializeBody = function(body) {
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

Game.prototype.applyStateToBody = function(sBody, body) {
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

Game.prototype.getGameState = function() {
    var state = {};
    state.puck = this.serializeBody(this.puck);
    state.players = [];
    var that = this;
    this.players.forEach(function (player) {
        var sBody = that.serializeBody(player);
        state.players.push(sBody);
    });
    state.gameStatus = this.gameStatus;
    return state;
};

// CLIENT FUNCTION
Game.prototype.applyState = function(state) {
    this.applyStateToBody(state.puck, this.puck);
    var that = this;
    state.players.forEach(function (playerState) {
        var playerBody = that.getPlayer(playerState.userid);
        if (!playerBody) playerBody = that.createPlayer(playerState.userid);
        that.applyStateToBody(playerState, playerBody);
    });
    this.gameStatus = state.gameStatus;
};

Game.prototype.startGame = function() {
    var that = this;
    this.players.forEach(function(player) {
        that.alivePlayerCount++;
        player.playerStatus = playerStatus.ALIVE;
        player.velocity = [0,0];
        player.angularVelocity = 0;
        if (!that.isPlayerInWorld(player)) {
            that.world.addBody(player);
            console.log("body ADDED to world");
        }
    });
    this.initializePlayerPositions();
};

Game.prototype.isPlayerInWorld = function(player) {
    var isPlayerInWorld = false;
    this.world.bodies.forEach(function (body){
        if (body.id === player.id) isPlayerInWorld = true;
    });
    return isPlayerInWorld;
};

Game.prototype.initializePlayerPositions = function() {
    var playerCount = this.players.length;
    var r = pxm(Math.min(worldWidth,worldHeight)/4);
    var x_centre = pxm(0);
    var y_centre = pxm(0);
    var angle = (2*Math.PI) / playerCount;
    var theta = 0;
    for (var i = 0; i < playerCount; i++) {
        var x = r * Math.cos(angle * i + theta) + x_centre;
        var y = r * Math.sin(angle * i + theta) + y_centre;
        this.players[i].position = [x, y];
        this.players[i].angle = 0;
    }
    this.puck.position = [0,0];
    this.puck.velocity = [0,0];
};

Game.prototype.getAlivePlayerCount = function() {
    var activePlayerCount = 0;
    this.players.forEach(function (player) {
        if (player.playerStatus === playerStatus.ALIVE) activePlayerCount++;
    });
    return activePlayerCount;
};

// GETTER/SETTERS
Game.prototype.getWorld = function() {return this.world;};
Game.prototype.getPlayers = function() {return this.players;};
Game.prototype.getThisPlayer =  function() {return this.thisPlayer;};
Game.prototype.getPuck = function() {return this.puck;};
Game.prototype.getArenaWalls = function() {return this.arenaWalls;};
Game.prototype.getEndpoints = function() {return this.endpoints;};
Game.prototype.getLastProcessedInput = function(){return this.lastProcessedInput};
Game.prototype.getUserId = function() {return this.userid;};

Game.prototype.getRoomId = function() {return this.roomid};
Game.prototype.getHostId = function() {return this.hostid};

Game.prototype.setUserId = function(_userid) {this.userid = _userid;};

Game.prototype.print = function() {
    console.log(this.roomid);
    console.log(this.world);
};

module.exports = Game;