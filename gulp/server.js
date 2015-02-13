'use strict';

var gulp = require('gulp');
var project = require('../project.conf.js');
var utils = require('./utils.js');
var path = project.path;

var browserSync = require( 'browser-sync' );
var fork = require('child_process').fork;
var gutil = require('gulp-util');

var serverApp = module.exports = {
	start: function(done, taskName, port ) {
		var args = port? [ String( port ) ] : [ String( project.port ) ];
		var instance = serverApp.instance = fork( path.server + 'server.js', args, {
			silent: true
		});
		instance.on('message', function(data){
			if ( data.message === 'started' && done ) {
				done();
			}
		});
		instance.stdout.on('data', function( msg ){
			if ( taskName ) {
				console.log( utils.printTaskName( taskName ), String( msg ).slice(0,-1) );
			}
		});
		instance.stderr.on('data', function( msg ){
			console.error( utils.printTaskNameError( 'serverApp' ), String( msg ) );
		});
	},

	stop: function(done, taskName) {
		if ( serverApp.instance ) {
			serverApp.instance.on('exit', function(){
				if ( taskName ) {
					console.log( utils.printTaskName( taskName ), 'Shutting down server');
				}
				if (done) done();
			});
			serverApp.instance.kill('SIGINT');
		}
		else {
			done();
		}
	},

	restart: function( done, taskName, port ){
		serverApp.stop(function(){
			serverApp.start( function(){
				if ( taskName ) {
					console.log( utils.printTaskName( taskName ), 'Server restarted');
				}
				if (done) done();
			}, null, port);
		});
	}
};

gulp.task('server:start', function( done ){
	serverApp.start( function(){
		done();
	}, 'server:start');
});

gulp.task('mytest', function(){
	serverApp.restart( null, 'mytest');
});

var watchServer = function( done, port ){
	var pl = require('path');
	serverApp.start( done , 'watch:server', port );
	gulp.watch( project.watch.serverFiles, function( data ){
		console.log( utils.printTaskName( 'watch:server' ), 
			gutil.colors.cyan( 'File', data.type ), 
			gutil.colors.magenta( pl.relative( path.base, data.path ) ) );
		serverApp.restart( done , 'watch:server', port);
	});
};

gulp.task( 'watch:server', watchServer );
gulp.task( 'watch:server:proxy', function(){
	watchServer( browserSync.reload, project.proxy.port );
});

gulp.task('watch:browser', ['watch:server:proxy'], function() {
	browserSync({
		proxy: project.proxy.host + ':' + project.proxy.port,
		open: false,
		port: project.port,
		files: project.watch.servedFiles
	});
});

gulp.task('develop', ['watch:browser', 'watch:test:unit']);
gulp.task('develop:quiet', ['watch:browser', 'watch:test:unit:quiet']);

gulp.task('develop:docs', ['watch:browser', 'watch:docs']);
