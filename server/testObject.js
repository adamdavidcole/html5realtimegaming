/**
 * Created by adamcole on 5/4/16.
 */
var counter = 0;

var testObj = function (testVal) {
    this.val = testVal;
};


testObj.prototype.incr = function() {
    counter++;
};

testObj.prototype.print = function() {
    console.log(this.val);
    console.log(counter);
};

module.exports = testObj;