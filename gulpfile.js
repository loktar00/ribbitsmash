var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    connect = require('gulp-connect'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    zip = require('gulp-zip');

gulp.task('javascript', function(){
    return gulp.src('./src/**/*.js')
    .pipe(concat('ribbitsmash.js'))
    .pipe(sourcemaps.init())
        .pipe(uglify().on('error', gutil.log))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload());
});

gulp.task('markup', function(){
    gulp.src('./src/**/*.html')
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
    .pipe(connect.reload());
});

gulp.task('zip', ['javascript', 'markup'], function(){
    return gulp.src('./dist/*.{html,js}')
        .pipe(zip('distrib.zip'))
        .pipe(gulp.dest('./entry'));
});

gulp.task('connect', function(){
    return connect.server({
        root: './dist',
        livereload : true
    });
});

gulp.task('watch', ['markup', 'javascript', 'zip'], function() {
    gulp.watch(['./src/**/*.js'], ['javascript']);
    gulp.watch(['./src/**/*.html'], ['markup']);
});

gulp.task('default', ['connect', 'javascript', 'markup', 'watch']);
