///**
// * This file contains stubs to enable Phaser to work on server side.
// * It should be loaded before anything else.
// */
//var jsdom = require('jsdom');
//var canvas = require('canvas');
//
//window = {
//    addEventListener: function(type,listener,useCapture) {},
//    removeEventListener: function(type,listener,useCapture) {},
//    screen: {
//        orientation: 'landscape-primary'
//    },
//    pageXOffset: 0,
//    pageYOffset: 0,
//    innerWidth: 1360,
//    innerHeight: 600,
//    setTimeout: setTimeout
//};
//
//// When p2 physics library is loaded. It adds itself to the window object
//// We want p2 to be a global on the server (server's global context is not window)
//Object.defineProperty(window, 'p2', {
//    set: function (value) {
//        p2 = value;
//    }
//});
//
//
//
//document = {
//    body: {
//        insertBefore: function(el, arg) {}
//    },
//    readyState: 'complete',
//    documentElement: {
//        clientWidth: 1360,
//        clientHeight: 600
//    },
//    createElement: function(tagName) {
//        var element = null;
//        if (tagName === 'canvas') {
//            element = {
//                style: {},
//                getContext: function(contextId) {
//                    return {
//                        fillRect: function(x, y, w, h) {},
//                        getImageData: function(sx, sy, sw, sh) {
//                            return {
//                                width: 0,
//                                height: 0,
//                                data: []
//                            };
//                        },
//                        createImageData: function(imagedata_or_sw,sh) {
//                            return {};
//                        },
//                        setTransform: function(m11, m12, m21, m22, dx, dy) {},
//                        drawImage: function(img_elem,dx_or_sx,dy_or_sy,dw_or_sw,dh_or_sh,dx,dy,dw,dh) {},
//                        clearRect: function(x, y, width, height){},
//                        putImageData: function(image_data,dx,dy,dirtyX,dirtyY,dirtyWidth,dirtyHeight) {}
//                    };
//                },
//                getBoundingClientRect: function () {
//                    return {
//                        bottom: 0,
//                        height: 0,
//                        left: 0,
//                        right: 0,
//                        top: 0,
//                        width: 0,
//                        x: 0,
//                        y: 0
//                    };
//                },
//                addEventListener: function(type,listener,useCapture) {},
//                removeEventListener: function(type,listener,useCapture) {}
//            };
//        }
//        return element;
//    },
//    addEventListener: function(type,listener,useCapture) {},
//    removeEventListener: function(type,listener,useCapture) {},
//};
//
//var document = jsdom.jsdom("<html><body></body></html>");
//global.window = document.parentWindow;
//console.log(document);
//global.window.process = process;
//global.window.Element = undefined;
//
//
//navigator = {
//    userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:31.0) Gecko/20100101 Firefox/31.0'
//};
//
Image = function() {
    // When a callback is assigned to the onload property
    // We trigger it almost immediately
    Object.defineProperty(this, 'onload', {
        set: function (callback) {
            var self = this;
            setTimeout(function() {
                self.complete = true;
                callback();
            }, 100);
        }
    });
};
//
//XMLHttpRequest = function() {};
//PhaserMeteor = {};

var jsdom = require('jsdom');
var canvas = require('canvas');
var window;
var isReady = false;

//console.log(jsdom.jsdom("<html><body></body></html>"));
var document = jsdom.env("<html><body></body></html>", function(err, w){
    if (err) console.log(err);
    window = w;

    global.document = window.document;
    console.log(JSON.stringify(document));
    global.Image = canvas.Image;
    global.window = window;
    global.window.process = process;
    PIXI = require('/Users/adamcole/Documents/Penn2016Spring/CIS497/untitled1/node_modules/phaser/build/custom/pixi.js');
    global.p2 = require('p2');
    global.navigator = {userAgent: 'node.js'};
    global.window.Element = undefined;
    global.window.CanvasRenderingContext2D = 'game';

    global.XMLHttpRequest = require('local-xmlhttprequest').XMLHttpRequest;

    global.PIXI = PIXI;

    document.createElement = function(tagName) {
                var element = null;
                if (tagName === 'canvas') {
                    element = {
                        style: {},
                        getContext: function(contextId) {
                            return {
                                fillRect: function(x, y, w, h) {},
                                getImageData: function(sx, sy, sw, sh) {
                                    return {
                                        width: 0,
                                        height: 0,
                                        data: []
                                    };
                                },
                                createImageData: function(imagedata_or_sw,sh) {
                                    return {};
                                },
                                setTransform: function(m11, m12, m21, m22, dx, dy) {},
                                drawImage: function(img_elem,dx_or_sx,dy_or_sy,dw_or_sw,dh_or_sh,dx,dy,dw,dh) {},
                                clearRect: function(x, y, width, height){},
                                putImageData: function(image_data,dx,dy,dirtyX,dirtyY,dirtyWidth,dirtyHeight) {}
                            };
                        },
                        getBoundingClientRect: function () {
                            return {
                                bottom: 0,
                                height: 0,
                                left: 0,
                                right: 0,
                                top: 0,
                                width: 0,
                                x: 0,
                                y: 0
                            };
                        },
                        addEventListener: function(type,listener,useCapture) {},
                        removeEventListener: function(type,listener,useCapture) {}
                    };
                }
                return element;
            };


    PIXI.CanvasPool= {

        /**
         * Creates a new Canvas DOM element, or pulls one from the pool if free.
         *
         * @method create
         * @static
         * @param parent {any} The parent of the canvas element.
         * @param width {number} The width of the canvas element.
         * @param height {number} The height of the canvas element.
         * @return {HTMLCanvasElement} The canvas element.
         */
        create: function (parent, width, height) {

            var idx = global.PIXI.CanvasPool.getFirst();
            var canvas;

            if (idx === -1)
            {
                var container = {
                    parent: parent,
                    canvas: document.createElement('canvas')
                }

                global.PIXI.CanvasPool.pool.push(container);

                canvas = container.canvas;
            }
            else
            {
                global.PIXI.CanvasPool.pool[idx].parent = parent;

                canvas = global.PIXI.CanvasPool.pool[idx].canvas;
            }

            if (width !== undefined)
            {
                canvas.width = width;
                canvas.height = height;
            }

            return canvas;

        },

        /**
         * Gets the first free canvas index from the pool.
         *
         * @method getFirst
         * @static
         * @return {number}
         */
        getFirst: function () {

            var pool = global.PIXI.CanvasPool.pool;

            for (var i = 0; i < pool.length; i++)
            {
                if (pool[i].parent === null)
                {
                    return i;
                }
            }

            return -1;

        },

        /**
         * Removes the parent from a canvas element from the pool, freeing it up for re-use.
         *
         * @method remove
         * @param parent {any} The parent of the canvas element.
         * @static
         */
        remove: function (parent) {

            var pool = global.PIXI.CanvasPool.pool;

            for (var i = 0; i < pool.length; i++)
            {
                if (pool[i].parent === parent)
                {
                    pool[i].parent = null;
                }
            }

        },

        /**
         * Removes the parent from a canvas element from the pool, freeing it up for re-use.
         *
         * @method removeByCanvas
         * @param canvas {HTMLCanvasElement} The canvas element to remove
         * @static
         */
        removeByCanvas: function (canvas) {

            var pool = global.PIXI.CanvasPool.pool;

            for (var i = 0; i < pool.length; i++)
            {
                if (pool[i].canvas === canvas)
                {
                    pool[i].parent = null;
                }
            }

        },

        /**
         * Gets the total number of used canvas elements in the pool.
         *
         * @method getTotal
         * @static
         * @return {number} The number of in-use (parented) canvas elements in the pool.
         */
        getTotal: function () {

            var pool = global.PIXI.CanvasPool.pool;
            var c = 0;

            for (var i = 0; i < pool.length; i++)
            {
                if (pool[i].parent !== null)
                {
                    c++;
                }
            }

            return c;

        },

        /**
         * Gets the total number of free canvas elements in the pool.
         *
         * @method getFree
         * @static
         * @return {number} The number of free (un-parented) canvas elements in the pool.
         */
        getFree: function () {

            var pool = global.PIXI.CanvasPool.pool;
            var c = 0;

            for (var i = 0; i < pool.length; i++)
            {
                if (pool[i].parent === null)
                {
                    c++;
                }
            }

            return c;

        }

    };

    /**
     * The pool into which the canvas dom elements are placed.
     *
     * @property pool
     * @type Array
     * @static
     */
    PIXI.CanvasPool.pool = [];

    var Phaser = require('phaser');
    global.Phaser = Phaser;
    isReady = true;
    exports = Phaser;
});

exports.isPhaserReady = function () {
    return isReady;
};