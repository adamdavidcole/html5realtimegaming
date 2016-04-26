/**
 * Created by adamcole on 4/5/16.
 */

var inputTypes = require('../shared/constants').inputTypes;

var unprocessedInputs = [];

var newInputs = [];

var keyboard = function(keyCode) {
    var key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;
    //The `downHandler`
    key.downHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isUp && key.press) key.press();
            key.isDown = true;
            key.isUp = false;
        }
        event.preventDefault();
    };

    //The `upHandler`
    key.upHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = false;
            key.isUp = true;
        }
        event.preventDefault();
    };

    //Attach event listeners
    window.addEventListener(
        "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
        "keyup", key.upHandler.bind(key), false
    );
    return key;
};

var rightPressed = false,
    leftPressed = false,
    downPressed = false,
    upPressed = false,
    rotateRightPressed = false,
    rotateLeftPressed = false;

var init = function() {
    //Capture the keyboard arrow keys
    var left = keyboard(37),
        up = keyboard(38),
        right = keyboard(39),
        down = keyboard(40),
        a = keyboard(65),
        d = keyboard(68);

    //var moveVelocity = 8;
    //var postVelocity = 0;
    var rightInterval;
    right.press = function() {
        rightPressed = true;
    };
    right.release = function() {
        newInputs.push(inputTypes.STOP_RIGHT);
        rightPressed = false;
    };
    left.press = function() {
        leftPressed = true;
    };
    left.release = function() {
        newInputs.push(inputTypes.STOP_LEFT);
        leftPressed = false;
    };

    up.press = function() {
        upPressed = true;
    };
    up.release = function() {
        newInputs.push(inputTypes.STOP_UP);
        upPressed = false;
    };
    down.press = function() {
        downPressed = true;
    };
    down.release = function() {
        newInputs.push(inputTypes.STOP_DOWN);
        downPressed = false;
    };

    //var angularMovement = 7.5;
    //var postAngularMovement = 0;
    a.press = function() {
        rotateRightPressed = true;
    };
    a.release = function() {
        newInputs.push(inputTypes.STOP_ROTATE_LEFT);
        rotateRightPressed = false;
    };
    d.press = function() {
        rotateLeftPressed = true;
    };
    d.release = function() {
        newInputs.push(inputTypes.STOP_ROTATE_RIGHT);
        rotateLeftPressed = false;
    };
};

var getInputs = function() {
    var inputCopy = newInputs.slice();
    newInputs = [];

    if (rightPressed) inputCopy.push(inputTypes.MOVE_RIGHT);
    else if (leftPressed) inputCopy.push(inputTypes.MOVE_LEFT);

    if (upPressed) inputCopy.push(inputTypes.MOVE_UP);
    else if (downPressed) inputCopy.push(inputTypes.MOVE_DOWN);

    if (rotateRightPressed) inputCopy.push(inputTypes.ROTATE_RIGHT);
    else if (rotateLeftPressed) inputCopy.push(inputTypes.ROTATE_LEFT);

    return inputCopy;
};

module.exports = {
    init: init,
    getInputs: getInputs
}