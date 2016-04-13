/**
 * Created by adamcole on 4/3/16.
 */

exports.inputTypes = {
    MOVE_LEFT: 0,
    MOVE_RIGHT: 1,
    MOVE_UP: 2,
    MOVE_DOWN: 3,
    ROTATE_RIGHT: 4,
    ROTATE_LEFT: 5,
    STOP: 6,
    STOP_RIGHT: 7,
    STOP_LEFT: 8,
    STOP_UP: 9,
    STOP_DOWN: 10,
    STOP_ROTATE_LEFT: 11,
    STOP_ROTATE_RIGHT: 12
};

exports.bodyTypes = {
    PLAYER: "player",
    PUCK: "puck",
    ARENA: "arena",
    BOUND: "bound"
};