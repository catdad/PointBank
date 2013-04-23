var db = require('./dataStore.js');

var searchr = require('./searchr.js');
var streamr = require('./streamr.js');
var geocoder = require('./geocoder.js').init();

var helper = require('./taskHelpers');

var config = require('./config.json');

module.exports = {
	createTask: function(req, res){
		console.log(req.body);
		var opt = req.body; //get options
		
		var task = {
			service: 'twitter',
			type: (opt.type === 'stream') ? 'stream':'search',
			interval: opt.interval || 15, //set default to 15 min
			query: opt.query,
			desiredTweets: Number(opt.desiredTweets) || config.maxTweets, //make sure value is numeric
			location: (typeof opt.location === 'object') ? opt.location:null, //esri bounding box
			toGeocode: (opt.toGeocode === 'true'), //POST values parsed as strings
			toGetCoords: (opt.toGetCoords === 'true'),
			toSaveAll: (opt.toSaveAll === 'true'),
			
			stats: {
				total: 0,
				duplicates: 0,
				coords: 0,
				parsedCoords: 0,
				liveGeocode: 0,
				localGeocode: 0,
				mined: 0,
				discarded: 0,
				
				runCount: 0,
				lastRun: null
			}
		};
		
		if (task.location) task.location = new Location(task.location);
		
		upsertTask(task, function(err, data){
			createCollection(data);
			res.send(data);
		}); /* */
	},
	getAll: function(req, res){
		getAllTasks(function(err, tasks){
			helper.send(res, 'tasks.jade', { title: 'Tasks', data: tasks });
		});
	},
	getOne: function(req, res){
		getOneTask(res, req.params.task, function(err, task){
			//getTweets(tasks[0], res);
			helper.send(res, 'task.jade', {
				title: 'Task : ' + (task.query || 'not found'),
				data: task,
				url: req.params.task
			});
		});
	},
	start: function(req, res){
		getOneTask(res, req.params.task, function(err, task){
			if (task.type === 'search')
				searchr.addTask(task, function(message){
					helper.JSON(res, {message: message});
				});
			else if (task.type === 'stream')
				streamr.addTask(task, function(message){
					helper.JSON(res, {message: message});
				});
			else helper.JSON(res, { error: 'unknown task type' });
		});
	},
	stop: function(req, res){
		getOneTask(res, req.params.task, function(err, task){
			if (task.type === 'search')
				searchr.removeTask(task, function(message){
					helper.JSON(res, {message: message});
				});
			else if (task.type === 'stream')
				streamr.removeTask(task, function(message){
					helper.JSON(res, {message: message});
				});
			else helper.JSON(res, { error: 'unknown task type' });
		});
	},
	query: function(req, res){
		queryForTweets(res);
	},
	upsert: function(task, callback){
		upsertTask(task, callback);
	},
	drop: function(req, res){
		getOneTask(res, req.params.task, function(err, task){
			db.collection( task._id.toString() ).drop();
			db.tasks.remove(task);
			
			helper.JSON(res, { message: 'deleted' });
		});
	}
};

// getter helpers
// end getter helpers

// database helpers
function getOneTask(res, task /*id string or id object*/, callback){
	var idObj = getIdObject(task);
	console.log(idObj);
	if ( !idObj ) {
		helper.send(res, 404, { error: 'invalid task id' });
	}
	else {
		db.tasks.find({_id: idObj}, function(err, tasks){
			if (err || !tasks.length){
				helper.send(res, 404, { error: 'task not found' });
			}
			else callback(err, tasks[0]);
		});
	}
}
function getAllTasks(callback){
	db.tasks.find({}, function(err, tasks){
		callback(err, tasks);
	}).sort({_id: -1});
}

function upsertTask(task, callback){
	db.tasks.save(task, function(err, data){
		if (callback) callback(err, data);
	});
}

function createCollection(task){
	var id = task._id.toString();
	
	console.log('creating indices');
	db.collection(id).ensureIndex({ id: 1 }, {unique:true, background: true});
	db.collection(id).ensureIndex({ latLon: "2d" }, {background: true});
	db.collection(id).ensureIndex({ epoch: 1 }, {background: true});
}

function queryForTweets(res){
	var taskId = res.req.params.task; // needs confirm
	
	var params = getQueryParams(res.req);
	var q = getQuery( params );
	var query = null;
	
	console.log(q);
	db.collection(taskId).find(q, function(err, tweets) {
		if (err){ // || !tweets.length) {
			helper.send(res, 404, { error: err });
		}
		else {
			console.log('found: ' + tweets.length);

			//if (params.detailed === false)
				//	tweets = shortenTweets(tweets);
				
			helper.send(res, 'tweets.jade', { title: 'Query', data: {count: tweets.length, data: tweets } })
			
			/*
			if (params.format === 'esriJSON'){
				var outSR = (url.parse(req.url, true).query.outSR || null);
				var result = convertToEsriJSON( shortenTweets(tweets), outSR );
				helper.JSON(res, result, callback);
			} */
		}
	}).sort( { epoch : params.order } ).limit(params.limit || 0);
}

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
			return false;
	}
	return idObj;
}
// end database helpers

function getQuery(params){
	var q = {};
	
	if (params.from_id){
		//catch errors better
		try{
			q._id = { $gt: db.ObjectId(params.from_id) };
		}
		catch(e) {}
	}
	if (params.near){
		var loc = {};
		loc["$near"] = [params.near.lat, params.near.lon];
		if (params.near.distance) loc["$maxDistance"] = params.near.distance / 69; //distance in miles
		q.latLon = loc;
	}
	if (params.start_time || params.end_time){
		var epoch = {};
		if (params.start_time) epoch["$gt"] = params.start_time;
		if (params.end_time) epoch["$lt"] = params.end_time;
		q.epoch = epoch;
	}
	
	return q;
}
function getQueryParams(req){ //parameters from Tweet endpoint queries
	var data = req.query;
	
	var limit = (data.limit == 0 /*string or int*/) ? 0 : (Number(data.limit) || 100);
	var from_id = data.from_id || null;
	var near = data.near || null;
	var start_time = Number(data.start_time) || null;
	var end_time = Number(data.end_time) || null;
	var detailed = (data.detailed === 'true');

	var order = data.order;
	if (order === 'a') order = 1;
	else order = -1;

	if (near){
		var arr = near.split(',');
		near = { lat: Number(arr[0]), lon: Number(arr[1]), distance: ( Number(arr[2]) || null ) };
	}

	var params = {
		limit: limit,
		order: order,
		from_id: from_id,
		start_time: start_time,
		end_time: end_time,
		near: near,
		detailed: detailed
	};

	return params;
}

// constructors
var Location = function(options){
	var latMin, latMax, lonMin, lonMax;
	latMin = Number(options.ymin);
	latMax = Number(options.ymax);
	lonMin = Number(options.xmin);
	lonMax = Number(options.xmax);
	
	//radius in degrees
	//var rad = (Math.abs(options.xmax-options.xmin)) / 2;
	var rad = (Math.abs(lonMax-lonMin)) / 2;
	
	//radius in kilometers (rough)
	var radius = Number(rad * 111);
	var unit = 'km';
	
	var center = {
		lat: (latMin+latMax)/2,
		lon: (lonMin+lonMax)/2,
		radius: radius + unit
	}

	var boundingBox = { latMin: latMin, latMax: latMax, lonMin: lonMin, lonMax: lonMax };
	
	var twitterStr = encodeURIComponent(center.lat + ',' + center.lon + ',' + center.radius)
	
	var mongoNear = {
		'near': [ center.lat, center.lon ],
		'maxDistance': rad
	}
	
	return {
		center: center,
		boundingBox: boundingBox,
		db: mongoNear,
		twitterStr: twitterStr,
		name: 'Pretty Location Name'
	};
}
// end constructors

