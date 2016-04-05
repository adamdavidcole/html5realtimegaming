/**
 * Created by adamcole on 4/5/16.
 */

var inputTypes = require('../shared/constants').inputTypes;

var unprocessedInputs = [];

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
        unprocessedInputs.push(inputTypes.MOVE_RIGHT);
        //rightInterval = setInterval(function() {
        //    unprocessedInputs.push(inputTypes.MOVE_RIGHT);
        //}, 5);
    };
    right.release = function() {
        unprocessedInputs.push(inputTypes.STOP);
        //clearInterval(rightInterval);
    };

    left.press = function() {
        unprocessedInputs.push(inputTypes.MOVE_LEFT);
    };
    left.release = function() {
        unprocessedInputs.push(inputTypes.STOP);
    };

    up.press = function() {
        unprocessedInputs.push(inputTypes.MOVE_UP);
    };
    up.release = function() {
        unprocessedInputs.push(inputTypes.STOP);
    };

    down.press = function() {
        unprocessedInputs.push(inputTypes.MOVE_DOWN);
    };
    down.release = function() {
        unprocessedInputs.push(inputTypes.STOP);
    };

    //var angularMovement = 7.5;
    //var postAngularMovement = 0;
    a.press = function() {
        unprocessedInputs.push(inputTypes.ROTATE_LEFT);
    };
    a.release = function() {
        unprocessedInputs.push(inputTypes.STOP);
    };

    d.press = function() {
        unprocessedInputs.push(inputTypes.ROTATE_RIGHT);
    };
    d.release = function() {
        unprocessedInputs.push(inputTypes.STOP);
    };
};

var getInputs = function() {
    var inputCopy = unprocessedInputs.slice();
    unprocessedInputs = [];
    return inputCopy;
};

module.exports = {
    init: init,
    getInputs: getInputs
}