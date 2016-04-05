/**
 * Created by adamcole on 4/2/16.
 */
var gulp = require('gulp');
var browserify = require('gulp-browserify');
var watchify = require('watchify');
var notify = require("gulp-notify");

//// Basic usage
gulp.task('scripts', function() {
    // Single entry point to browserify
    gulp.src(['client/client.js', 'shared/gameRenderer.js'])
        .pipe(browserify({
            insertGlobals : true,
            //cache: {},
            //packageCache: {},
            //plugin: [watchify]
        }))
        .pipe(gulp.dest('public/build'))
});
