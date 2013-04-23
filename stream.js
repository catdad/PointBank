var url = require('url');
var config = require('./config.json');
var header = require('./headers');

var Tuiter = require('tuiter');
var	keys = require('./keys.json');

var helper = require('./taskHelpers');

var databaseUrl = config.dbName; // "username:password@example.com/mydb"
var collections = ['streams'];
var db = require('mongojs').connect(databaseUrl, collections);

//global variables
var streamer = new Tuiter(keys);
var runningStream = false;
var runTimer, endTimer;

exports.getAll = function(req, res){
	db.streams.find({}, function(err, streams){
		if (err || !streams.length)
			handleStreamErrors(req, res, err, streams);
		else{
			res.render('streams.jade', {
				locals: { title: 'Stream Tasks', data: streams, running: runningStream }
			});
		}
	});
}

exports.create = function (req, res){
	var data = url.parse(req.url, true).query;
	var query = data.query || null;
	var location = data.location || null;
	
	if (!query && !location){
		helper.JSON(res, {error: 'you must specify query or location'});
		return false;
	}
	
	var task = {
		query: query,
		location: location,
		count: 0,
		totalMined: 0,
		lastRun: null,
		runTime: 0
	}
	
	db.streams.save(task, function(err, saved){
		if (err || !saved)
			helper.JSON(res, {error: 'error ' + err}, getCallback(req));
		else
			helper.JSON(res, {task: saved}, getCallback(req));
	});
}

exports.start = function (req, res){
	var id = req.params.id;
	
	if (runningStream){
		console.log('another stream already running');
		helper.JSON(res, {error: 'a task is already running'}, getCallback(req));
		return false;
	}
	
	var idObj = getIdObject(id);
	db.streams.find({_id: idObj}, function(err, streams){
		if (err || !streams.length)
			handleStreamErrors(req, res, err, streams)
		else{
			var task = streams[0];
			startStream(task);
			helper.JSON(res, {task: task}, getCallback(req));
		}
	});
}

exports.stop = function(req, res){
	if (runningStream) {
		//globalStream.emit('end');
		//globalStream._events.end();
		runningStream = false;
		helper.JSON(res, {success: 'stop command sent'}, getCallback(req));
		//globalStream = null;
	}
	else{
		helper.JSON(res, {error: 'no stream found'}, getCallback(req));
	}
}

exports.drop = function(req, res){
	var id = req.params.id;
	
	var idObj = getIdObject(id);
	db.streams.remove({_id: idObj});
	db.collection(id).drop();
	helper.JSON(res, {deleted: id}, getCallback(req));
}

exports.getTweets = function(req, res, format){
	var id = req.params.id;
	var idObj = getIdObject(id);
	
	db.streams.find({_id: idObj}, function(err, streams){
		if (err || !streams.length)
			handleStreamErrors(req, res, err, streams)
		else{
			helper.retrieveTweets(db, req, res, streams[0], format, getCallback(req));
		}
	});
}

function startStream(task){
	var taskID = task._id.toString();
	var geoCount = 0;
	var totalCount = 0;
	var time = 0;
	
	var filter;
	if (task.query) filter = {track: task.query};
	else filter = {location: task.location};
	
	console.log( 'stream filter: ' + JSON.stringify(filter) );

	//ensure indices on empty collection
	db.collection(taskID).ensureIndex({ id:1 }, {unique: true, background: true});
	db.collection(taskID).ensureIndex({ latLon: "2d" }, {background: true});
	db.collection(taskID).ensureIndex({ epoch: 1 }, {background: true});
	
	streamer.filter(filter, function(stream){
		runningStream = taskID;
		
		// New tweet
		stream.on("tweet", function(data){
			totalCount++;
			task.totalMined++;
			
			if(data.geo && data.geo.coordinates){
				geoCount++;
				
				//get latLon
				var latLon = data.geo.coordinates;
				data.latLon = latLon;
				
				//get epoch
				var date = data.created_at;
				var epoch = new Date(date).getTime();
				data.epoch = epoch;
				
				db.collection(taskID).save(data);
				
				task.count++;
				//task.lastRun = new Date(); //local time
				task.lastRun = new Date().toGMTString(); //GMT time
				db.streams.save(task);
				
				//temp socket test
				if (globalSocket){
					console.log('emitting tweet');
					globalSocket.emit('tweet', data);
				}
				
				//if(data.text.toLowerCase().indexOf(track) > -1) search++;
			}
		});
		
		stream.on('search', function(data){
			//console.log(data);
		});
		stream.on('delete', function(data){
		
		});
		stream.on('error', function(data){
			//console.log('error: ' + data);
		});
		
		endTimer = setInterval(function(){
			if ( !(runningStream) ){
				console.log('ending stream');
				stream.emit('end');
				clearInterval(runTimer);
				clearInterval(endTimer);
				
				task.lastRun = new Date().toGMTString(); //GMT time
				db.streams.save(task);
			}
		}, 500)
	});
	
	
	runTimer = setInterval(function(){
		time++;
		task.runTime++;
		
		
		if ((time % 10) === 0) {
			task.lastRun = new Date().toGMTString(); //GMT time
			db.streams.save(task);
			console.log(time + ' seconds -- ' + geoCount + '/' + totalCount + ' -- ' + runningStream);
			
			//push message to client
			if (globalSocket){
				globalSocket.emit('task', task);
			}
			else console.log('no socket found');
			
		}

	}, 1000);
}

function handleStreamErrors(req, res, err, streams){
	if (err || !streams.length)
		if (err) helper.JSON(res, {error: err}, getCallback(req));
		else if (streams.length === 0) helper.JSON(res, {error: 'no tasks found'}, getCallback(req));
		else helper.JSON(res, {error: 'unknown error'});
}

// *********** HELPERS ***************
function getIdObject(id){
	var idObj;
	try{
		idObj = db.ObjectId(id);
	}
	catch(e){
		console.log('id error: ' + e);
		if (id === 'stream' || id === 'oldStream')
			idObj = id;
		else
			return null;
	}
	return idObj;
}

function getCallback(req){
	var data = url.parse(req.url, true);
	var callback = data.query.callback || null;
	return callback;
}