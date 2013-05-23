/*
 *
 * This is the main file of the project.
 * It handles routing and creating the socket connections.
 *
*/

var io = require('socket.io');

var express = require('express');
var app = require('express').createServer();
var connect = require('connect');
var url = require('url');
var gzippo = require('gzippo');
var config = require('./config.json');
var geocoder = require('./geocoder');
var enrich = require('./enrich');

globalSocket = null; //IMPORTANT! -- creates global variable in all modules

var twitter = require('./twitter');
var stream = require('./stream');
var common = require('./taskHelpers');

app.configure(function(){
	app.set('views', __dirname + '/views');
	//app.use(connect.compress());
	app.use(express.bodyParser());
	app.use(express.responseTime());
	//app.use(express.bodyDecoder());
	//app.use(express.methodOverride());
	//app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
	//app.use(app.router);
	app.use('/public', express.static(__dirname + '/public'));
	//app.use( '/public', gzippo.staticGzip(__dirname + '/public') );
	app.use( gzippo.compress() );
});

app.get('*', function(req, res, next){
	console.log(req.url);
	next();
});

app.get('/', function(req, res){
	res.render('index.jade', {
		locals: {
			title: 'Task Master'
		}
	});
});

// ************* TEST ROUTES *************
// These routes are unnecessary for the project
/*
app.get('/test/start', function(req, res){
	twitter.startChild(req, res);
});
app.get('/test/stop', function(req, res){
	twitter.stopChild(req, res);
});
app.get('/test/print', function(req, res){
	twitter.testPrint(req, res);
});
//app.get('/test/:id', function(req, res){
//	console.log('running test');
	//twitter.test(req, res);
//});
/* */

app.get('/test/local', function(req, res){
	geocoder.local(res);
});
app.get('/test/live', function(req, res){
	geocoder.live(res);
});

app.get('/test/stream', function(req, res){
	var streamr = require('./streamr');
	streamr.test(req);
});

// ************* END TEST ROUTES ***********

// ************* NEW ROUTES ****************
var taskr = require('./taskr');

app.get('/collect', function(req, res){
	res.render('collect.jade', {
		locals: { title: 'Create Task' }
	});
});
app.post('/collect', function(req, res){
	taskr.createTask(req, res);
});

app.get('/data', function(req, res){
	taskr.getAll(req, res);
});
app.get('/data/:task', function(req, res){
	taskr.getOne(req, res);
});
app.get('/data/:task/start', function(req, res){
	taskr.start(req, res);
});
app.get('/data/:task/query', function(req, res){
	taskr.query(req, res);
});
app.get('/data/:task/delete', function(req, res){
	taskr.drop(req, res);
});

// ************* END NEW ROUTES ************


// OLD ROUTES
// ************* SEARCH ROUTES *************
app.get('/twitter', function(req, res){
	twitter.getAllTasks(req, res, null);
});
app.get('/twitter/json', function(req, res){
	twitter.getAllTasks(req, res, 'json');
});
app.get('/twitter/create', function(req, res){
	//send form to create new task
	res.render('createTask.jade', {
		locals: { title: 'Create a task' }
	});
});
app.post('/twitter/new', function(req, res){
	//accept for data to create new task
	twitter.createNewTask(req, res);
});
app.get('/twitter/import', function(req, res){
	res.render('import.jade', {
		locals: { title: 'Import task data' }
	});
});
app.post('/twitter/import', function(req, res){
	twitter.importTask(req, res);
});
app.get('/twitter/compilation', function(req, res){
	twitter.createCompilation(req, res);
});
app.post('/twitter/compilation', function(req, res){
	twitter.compileTasks(req, res);
});
app.get('/twitter/html/:id', function(req, res){
	twitter.viewTweets(req, res, 'html');
});
app.get('/twitter/json/:id', function(req, res){
	twitter.viewTweets(req, res, 'json');
});
app.get('/twitter/delete/:id', function(req, res){
	twitter.deleteTask(req, res);
});
app.get('/twitter/task/:id/json', function(req, res){
	twitter.describeTask(req, res, 'json');
});
app.get('/twitter/task/:id', function(req, res){
	twitter.describeTask(req, res, null);
});

//esriJSON routes
app.get('/twitter/esriJSON/:id/query', function(req, res){
	twitter.viewTweets(req, res, 'esriJSON');
});
app.get('/twitter/esriJSON/:id', function(req, res){
	var helper = require('./taskHelpers');
	helper.describeEsriTask(req, res);
});
// ************* END SEARCH ROUTES ****************

// ************* STREAMING ROUTES *****************
app.get('/stream/create', function(req, res){
	stream.create(req, res);
});
app.get('/stream/stop', function(req, res){
	stream.stop(req, res);
});
app.get('/stream/start/:id', function(req, res){
	stream.start(req, res);
});
app.get('/stream/drop/:id', function(req, res){
	stream.drop(req, res);
});
app.get('/stream/json/:id', function(req, res){
	stream.getTweets(req, res, 'json');
});
app.get('/stream/html/:id', function(req, res){
	stream.getTweets(req, res, 'html');
});
app.get('/stream/esriJSON/:id/query', function(req, res){
	stream.getTweets(req, res, 'esriJSON');
});
app.get('/stream/esriJSON/:id', function(req, res){
	//describe task
	var helper = require('./taskHelpers');
	helper.describeEsriTask(req, res);
});
app.get('/stream', function(req, res){
	stream.getAll(req, res);
});
// ************* END STREAMING ROUTES *************

app.get('/enrich/:id', function(req, res){
	enrich.sentiment(req, res);
});
app.get('/enrich', function(req, res){
	res.render('enrich.jade', {
		locals: { title: 'Enrichment Task' }
	});
});

app.get('/legacy', function(req, res){
	twitter.dumpData(req, res, 'discard', null);
});
app.get('/discarded', function(req, res){
	twitter.dumpData(req, res, 'discarded', null);
});
app.get('/invalid', function(req, res){
	twitter.dumpData(req, res, 'invalid', null);
});
app.get('/local', function(req, res){
	twitter.dumpData(req, res, 'localGeocoder', {hits: -1});
});
app.get('/errors', function(req, res){
	twitter.dumpData(req, res, 'errors', null);
});

app.get('/api', function(req, res){
	res.render('api.jade', {
		locals: { title: 'API Filters' }
	});
});
app.get('/help', function(req, res){
	res.render('article.jade', {
		locals: { title: 'Help Documentation' }
	});
});
app.get('/lookup', function(req, res){
	var geocoder = require('./geocoder');
	geocoder.lookup(req, res);
});

app.get('*', function(req, res){
	common.send(res, 404, {error: 'The page does not exist.'});
});

app.listen(config.nodePort);

// ******* SOCKET.IO CODE ********
//var sio = io.listen(app);
var sio = io.listen(app, { log: false }); //log set to false to not pollute console; turn on to debug
//app.listen(8181);

var s = sio
	.on('connection', function(socket){
		//console.log('A socket connected!');
		globalSocket = socket;
	});
// ******* END SOCKET CODE *******