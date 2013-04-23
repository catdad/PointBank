var request = require('request');
var url = require('url');
var header = require('./headers');
var geocoder = require('./geocoder');
var config = require('./config.json');

var helper = require('./taskHelpers');

//console colors
var red = '\033[31m';
var blue = '\033[34m';
var reset = '\033[0m';

var databaseUrl = config.dbHost + config.dbName; // "username:password@example.com/mydb"
var collections = ['tasks'];
var db = require('mongojs').connect(databaseUrl, collections);

var runningTasks = new Object();
var taskErrors = new Object();

exports.createNewTask = function (req, res){
	var term = req.body.term;
	var tweets = Number(req.body.tweets);
	var interval = Number(req.body.interval);
	var lat = Number(req.body.lat);
	var lon = Number(req.body.lon);
	var radius = req.body.radius;
	var radiusUnit = req.body.radiusUnit;

	var location = (req.body.location === 'true');
	var geo = (req.body.geo === 'true');
	var geocode = (req.body.geocode === 'true');

	if (tweets > config.maxTweets) tweets = config.maxTweets;

	var task = {
		query: term,
		interval: interval,
		geo: geo,
		geocode: geocode,
		location: null,
		boundingBox: null,
		refreshURL: null,

		running: false,
		runCount: 0,
		lastRun: null,

		count: 0,
		totalTweets: tweets,

		totalMined: 0,
		hadGeo: 0,
		hadParse: 0,
		hadLocal: 0,
		hadGeocode: 0,
		discarded: 0,
		duplicates: 0
	}

	if (location === true){
		task.location = { lat: lat, lon: lon, radius: (radius + radiusUnit) };
		var rad;
		if (radiusUnit === 'km'){
			rad = Number(radius / 111);
		}
		else { //default to miles ('mi')
			rad = Number(radius / 69);
		}

		var latMin, latMax, lonMin, lonMax;
		latMin = lat - rad;
		latMax = lat + rad;
		lonMin = lon - rad;
		lonMax = lon + rad;

		task.boundingBox = { latMin: latMin, latMax: latMax, lonMin: lonMin, lonMax: lonMax };
		console.log(task.boundingBox);
	}

	db.tasks.save(task, function(err, saved){
		if (saved){
			var col = saved._id.toString();
			db.collection(col).ensureIndex({id:1}, {unique:true});

			if (task.geo || task.geocode){
				console.log('creating collection indices');
				db.collection(col).ensureIndex({ latLon: "2d" });
				db.collection(col).ensureIndex({ epoch: 1 });
			}

			helper.JSON(res, {id: saved._id});
			//header.json(res);
			//var j = JSON.stringify({id: saved._id});
			//res.end(j);
		}
		else {
			//save error
			helper.JSON(res, {error: 'save error: ' + err});
			//header.json(res);
			//var j = JSON.stringify({error: 'save error: ' + err});
			//res.end(j);
		}
	});
}

exports.getAllTasks = function (req, res, format){
	getAllTasks(function(err, tasks){
		if (format === 'json'){
			helper.JSON(res, {count: tasks.length, tasks: tasks});
		}
		else{
			res.render('tasks.jade', {
				locals: {
					title: 'Tasks',
					data: tasks
				}
			});
		}
	});
}

exports.startTask = function (req, res){
	if (objSize(runningTasks) > config.maxTasks){
		helper.JSON(res, {error: 'running tasks are at capacity'});
	}
	else{
		var id = req.params.id;

		db.tasks.find({_id: db.ObjectId(id)}, function(err, tasks){
			if (err || !tasks.length){
				helper.JSON(res, {error: 'task not found'});
			}
			else{
				startTask(tasks[0], res);
			}
		});
	}
}

exports.stopTask = function(req, res){
	var id = req.params.id;

	var idObj = getIdObject(id);
	if ( !(idObj) ) {
		res.send('error: invalid id');
		return false;
	}

	db.tasks.find({_id: idObj}, function(err, tasks){
		if (err || !tasks.length){
			helper.JSON(res, {error: 'task not found'});
		}
		else{
			stopTask(tasks[0], res);
		}
	});
}

exports.viewTweets = function (req, res, format){
	var id = req.params.id;
	var callback = getCallback(req);

	var idObj = getIdObject(id);
	if ( !(idObj) ) {
		res.send('error: invalid id');
		return false;
	}
	
	db.tasks.find({_id: idObj}, function(err, tasks){
		var error = null;
		var task = null;

		if (err || !tasks.length){
			error = 'task not found';
		}
		else{
			task = tasks[0];
			//res.send('view tweets for id: ' + task._id + '<br/>search term: ' + task.query)
		}

		if (error){
			if (format === 'json') helper.JSON(res, {error: error}, callback, null);
			else {
				header.html(res, error);
			}
		}
		else {
			helper.retrieveTweets(db, req, res, task, format, callback);
		}
	});
}

exports.deleteTask = function (req, res){
	var id = req.params.id;

	var idObj = getIdObject(id);
	if ( !(idObj) ) {
		res.send('error: invalid id');
		return false;
	}
	
	db.tasks.find({_id: idObj}, function(err, tasks){
		if (err || !tasks.length){
			res.send('task not found');
		}
		else{
			//getTweets(tasks[0], res);
			var task = tasks[0];
			deleteTask(task);
			var str = 'task deleted: ' + task._id;
			helper.JSON(res, {success: str});
		}
	});
}

exports.describeTask = function(req, res, format){
	var id = req.params.id;
	var json = (format === 'json');

	var idObj = getIdObject(id);
	if ( !(idObj) ) {
		if (json)
			helper.JSON(res, {error: 'error: inlavid id'}, null);
		else
			res.send('error: invalid id');
		return false;
	}

	db.tasks.find({_id: idObj}, function(err, tasks){
		if (err || !tasks.length){
			if (json)
				helper.JSON(res, {error: 'task not found'}, null);
			else
				res.send('task not found');
		}
		else{
			//getTweets(tasks[0], res);
			var task = tasks[0];
			if (json){
				helper.JSON(res, {task: task}, null);
			}
			else {
				res.render('task.jade', {
					locals: {
						title: 'Task : ' + task.query,
						data: task,
						url: id
					}
				});
			}
		}
	});
}

exports.importTask = function(req, res){
	var importUrl = req.body.url;
	var callback = req.body.callback;

	if (importUrl){
		importTask(res, importUrl, callback);
	}
	else{
		helper.JSON(res, {error: 'no url specified'}, callback);
	}
}

exports.createCompilation = function(req, res){
	getAllTasks(function(err, tasks){
		res.render('createCompilation.jade', {
			locals: { title: 'Create Compilation' },
			data: tasks
		});
	});
}

exports.compileTasks = function(req, res){
	var importTasks = req.body.tasks || [];
	var importUrls = req.body.urls || [];
	var callback = req.body.callback || null;

	if ((importTasks.length === 0) && (importUrls.length === 0)) helper.JSON(res, {error: 'no tasks were found'});
	else compileTasks(res, importTasks, importUrls, callback);
}

exports.dumpData = function(req, res, name, sort){
	db.collection(name).find({}, function (err, places){
		if (places.length){
			helper.JSON(res, { count: places.length, places: places });
		}
		else helper.JSON(res, { error: 'there are currently no results' });
	}).sort(sort || {});
}

//************* TEST FUNCTIONS ******************
exports.test = function(req, res){
	var tuiter = require('./test');
	tuiter.test(req, res);
	
	//res.send('test not found');
}
exports.testPrint = function(req, res){
	var tuiter = require('./test');
	tuiter.testPrint(req, res);
	
	//res.send('test not found');
}

exports.startChild = function(req, res){
	child.create();
	res.send('child created');
}
exports.stopChild = function(req, res){
	child.stop();
	res.send('stop command sent');
}
//************ END TEST FUNCTIONS *****************

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

function getCallback(req){
	var data = url.parse(req.url, true);
	var query = data.query;

	if (!query.callback) return false;
	else return query.callback;
}

function getTask(task /*id string or id object*/, callback){
	var id;
	if (typeof task === 'string'){
		console.log('get task by string');
		id = db.ObjectId(task);
	}
	else {
		console.log('get task by id object');
		id = task;
	}

	db.tasks.find({_id: id}, function(err, tasks){
		callback(err, tasks);
	});
}
function getAllTasks(callback){
	db.tasks.find({}, function(err, tasks){
		callback(err, tasks);
	}).sort({_id: -1});
}

function startTask(task, res){
	var taskId = task._id.toString()
	
	if (!runningTasks[taskId]){
		if (task.count >= task.totalTweets){
			helper.JSON(res, {error: 'The limit for this task has been reached'});
		}
		else {
			task.running = true;
			runningTasks[taskId] = task;
			getTweets(task);

			var str = 'task started: ' + task._id;
			if (res) helper.JSON(res, {success: str});
			else return true;
		}
		//res.send('task started: ' + JSON.stringify(task));
	}
	else {
		if (res) helper.JSON(res, {error: 'task is already running'});
		else return false;
		//res.send('task is already running: ' + JSON.stringify(task));
	}
}

function stopTask(task, res){
	var taskId = task._id.toString();
	db.tasks.find({_id: task._id}, function(err, tasks){
		if (err || !tasks.length){
			if (res) helper.JSON(res, {error: 'task was not found'});
			else return false;
		}
		else{
			var task = tasks[0];
			runningTasks[taskId].running = false;
			db.tasks.update({_id: task._id}, runningTasks[taskId], {}, function(err) {
				//delete task from array in 5 seconds
				setTimeout(function() {
					delete runningTasks[taskId];
				}, (60000 * 5));

				var str = 'task stopped: ' + task._id;
				if (res) helper.JSON(res, {success: str});
				else return true;
			});
		}
	});
}

function deleteTask(task){
	stopTask(task, false);
	var col = task._id.toString();
	db.collection(col).drop();
	db.tasks.remove({_id: task._id});
}

function getTaskFromURL(importUrl, callback){
	console.log('importing URL: ' + importUrl);
	request(importUrl, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var response = JSON.parse(body);
			var errorRecieved = '';
			var task, collection;

			if (response.meta){
				//get task definition from response JSON
				task = response.meta;
			}
			if (response.results){
				//get tweets from response JSON
				collection = response.results;
			}

			if (!task || !collection){
				errorRecieved = 'no valid task was foud';
			}

			//delete original id of task definition
			delete task._id;

			callback(task, collection);
		}
	});
}

function importTask(res, importUrl, callback){
	getTaskFromURL(importUrl, function(task, collection){
		//save task definition in local db
		db.tasks.save(task, {safe:true}, function(err, saved) {
			if (err || !saved) {
				helper.JSON(res, {error: 'task could not be saved -- ' + err}, callback);
				return false;
			}
			else{
				var id = saved._id.toString();

				//save tweets in local collection
				db.collection(id).save(collection, {safe:true}, function(err, saved) {
					if (err || !saved) {
						helper.JSON(res, {error: 'collection could not be saved -- ' + err}, callback);
						return false;
					}
					else{
						db.collection(id).ensureIndex({id:1}, {unique:true, background: true});

						if (task.geo || task.geocode){
							console.log('creating collection indices');
							db.collection(id).ensureIndex({ latLon: "2d" }, {background: true});
							db.collection(id).ensureIndex({ epoch: 1 }, {background: true});
						}
						helper.JSON(res, {success: 'task import was successful'}, callback);
					}
				});
			}
		});
	});
}

//var asyncSave = function(taskIDs /*IDs to compile*/, taskToSave /*destination task object*/){
function syncSave(taskIDs /*IDs to compile*/, taskToSave /*destination task object*/){
	var counter = taskIDs.length;
	var next = function() {
		if (--counter === 0) {
			updateTweetCount(taskToSave);
			//done();
		}
	};

	for (i in taskIDs) {
		saveIntoCompilationTask(taskIDs[i], taskToSave, next);
	}
}
function syncSaveURL(taskURLs /*URLs to compile*/, taskToSave /*destination task object*/){
	console.log('syncSaveURL ' + taskURLs);
	var counter = taskURLs.length;
	var next = function() {
		if (--counter === 0) {
			updateTweetCount(taskToSave);
			//done();
		}
	};

	for (i in taskURLs) {
		saveIntoCompilationTaskFromURL(taskURLs[i], taskToSave, next);
	}
}

function compileTasks(res, tasks, urls, callback){
	var task = {
		query: [],
		location: [],
		count: 0,
		totalTweets: 0,
		totalMined: 0,
		compilation: true
	}

	db.tasks.save(task, {safe:true}, function(err, saved) {
		if (err || !saved) {
			console.log('compile task was not saved');
		}
		else{
			console.log('compile task was saved!');
			var id = saved._id.toString();
			//create indices on empty collection
			db.collection(id).ensureIndex({id:1}, {unique: true, background: true});
			db.collection(id).ensureIndex({ latLon: "2d" }, {background: true});
			db.collection(id).ensureIndex({ epoch: 1 }, {background: true});

			if (tasks && tasks.length > 0){
				console.log(tasks);
				syncSave(tasks, saved);
			}

			if (urls && urls.length > 0){
				console.log(urls);
				syncSaveURL(urls, saved);
			}
		}
	});

	helper.JSON(res, {success: 'compile is being processed'});
}

function concatCompileTaskDefinitions(compileTask, childTaskID /* id of task to find, or a task object */, callback){
	var concatTasks = function(task){
		if (task.compilation){
			compileTask.query = compileTask.query.concat( task.query );
		}
		else
			compileTask.query.push( task.query );

		compileTask.location.push( task.location );
		compileTask.totalMined += task.count;
	}

	if (childTaskID.query && childTaskID.location && childTaskID.count){
		var task = childTaskID;
		concatTasks(task);

		console.log('concat: ' + childTaskID);
		callback();
	}
	else {
		getTask(childTaskID, function(err, tasks){
			if (! (err || (tasks.length === 0)) ){
				var task = tasks[0];
				concatTasks(task);

				console.log('concat: ' + childTaskID);
				callback();
			}
			else {
				console.log('concat was false');
				callback();
			}
		});
	}
}

function saveIntoCompilationTask(taskID, taskToSave, next){
	db.collection(taskID).find({}, function(err, tweets){
		if (! (err || (tweets.length === 0)) ){
			db.collection( taskToSave._id.toString() ).save(tweets, {safe:true}, function(err, saved){
				console.log('finsihed adding task ' + taskID);
				concatCompileTaskDefinitions(taskToSave, taskID, next);
			});
		}
		else next();
	});
}

function saveIntoCompilationTaskFromURL(taskUrl, taskToSave, next){
	console.log('compile url: ' + taskUrl);

	getTaskFromURL(taskUrl, function(task, collection){
		db.collection( taskToSave._id.toString() ).save(collection, {safe:true}, function(err, saved){
			console.log('finsihed adding task ' + taskUrl);
			concatCompileTaskDefinitions(taskToSave, task, next);
		});
	}); /* */
}

function updateTweetCount(task){
	db.collection( task._id.toString() ).find({}, function(err, tweets){
		task.count = tweets.length;
		db.tasks.save(task);
		console.log('finished compiling');
	});
}

function getTweets(task){ //get Tweets from Twitter
	var taskId = task._id.toString();

	//check if task needs to continue
	if (runningTasks[taskId] && runningTasks[taskId].running &&
		runningTasks[taskId].count < runningTasks[taskId].totalTweets)
	{
		setTimeout(function() {
			getTweets(task);
		}, (60000 * task.interval));
	}
	else {
		stopTask(task, false);
		return false;
	}

	var searchURL = ''; //'http://api.twitter.com/search.json';

	if (task.refreshURL === null){
		//searchURL += '?count=200&rpp=100&result_type=recent&q=' + encodeURIComponent(task.query);
		searchURL += '?count=100&result_type=recent&q=' + encodeURIComponent(task.query);
		if (task.geocode !== null){
			var geocode = encodeURIComponent(task.location.lat + ',' +
											 task.location.lon + ',' +
											 task.location.radius);
			searchURL += '&geocode=' + geocode;
		}
		console.log('*new search: ' + searchURL);
	}
	else {
		searchURL += task.refreshURL + '&rpp=100';
		console.log('*refresh search: ' + searchURL);
	}

	getTweetsFromURL(task, searchURL);
}

function getTweetsFromURL(task, queryURL){
	var taskId = task._id.toString();
	if (!runningTasks[taskId].running) return false;
	
	var oauth = {
		consumer_key: 'XqLnfDA3FE92QV8dHZFerQ',
		consumer_secret: 'KmI3cRAAGI7RHbzd1fAlBxGYX5lrjRHfkTW5YiaZE',
		token: '168988932-xYuJDPcTgfgaLjstrW8wAPeoEWYWC05xaFcS93OA',
		token_secret: 'Iy0dVjzys70b61TKNy9SuZz4dKnSJLewLfKaNE7jw'
    };
	
	//var searchURL = 'http://api.twitter.com/search.json' + queryURL;
	var searchURL = 'https://api.twitter.com/1.1/search/tweets.json' + queryURL;

	request({url:searchURL, oauth:oauth}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var data = JSON.parse(body).statuses;
			//var data = response.results;
			
			console.log('tweets: ' + data.length);
			
			for (i in data){
				var tweet = data[i];
				runningTasks[taskId].totalMined += 1;

				if (task.geo || task.geocode) { //get location
					if (tweet.geo != null){
						//tweet has geo, get coords
						var latLon = tweet.geo.coordinates;
						tweet.latLon = latLon;
						saveTweet(task._id, tweet, 'geo');
					}
					else {
						//try to parse coordinates
						//var latLon = geocoder.parse(tweet.location);
						var latLon = geocoder.parse(tweet.user.location);
						if (latLon.length > 0){
							//location parsed
							tweet.latLon = latLon;
							saveTweet(task._id, tweet, 'parse');
						}
						else if(task.geocode) { //check is user requested geocode
							//var geocode = geocodeTweet(task, tweet);
							var geocode = localLookup(task, tweet);
						}
						else {
							runningTasks[taskId].discarded += 1;
						}
					}
				}
				else { //do not get location
					saveTweet(task._id, tweet, null);
				}
			}

			runningTasks[taskId].refreshURL = response.refresh_url;
			runningTasks[taskId].runCount += 1;
			runningTasks[taskId].lastRun = new Date();

			db.tasks.update({_id: task._id}, runningTasks[taskId], {}, function(err) {
					//if (err) console.log('task update error: ' + err)
					//else console.log(red + 'refresh saved' + reset);
			});

			//page through remaining tweets -- if task is still running
			if (response.next_page && runningTasks[taskId] && runningTasks[taskId].running &&
				runningTasks[taskId].count < runningTasks[taskId].totalTweets)
			{
				console.log(red + 'next page ' + response.next_page + reset);
				pagingTask(task, response.next_page);
			}
		}
		else {
			//if twitter returns an error, try the query again
			try{
				var ec = response.statusCode;
				//console.log('error: ' + ec + ' ' + error);
				if (ec === 500 || ec === 503 || ec === 502) {
					setTimeout( function(){
						getTweetsFromURL(task, queryURL);
					}, 5000);
				}
				else if (ec === 404){
					console.log('**404** ' + response.body);
				}
				else {
					console.log(ec + ' ' + response.body);
				}
			}
			catch(e){
				//console.log(e);
				setTimeout( function(){
					getTweetsFromURL(task, queryURL);
				}, 5000);
			}
		}
	});
}

function pagingTask(task, nextPage){
	var taskId = task._id.toString();

	console.log('paging errors: ' + taskErrors[taskId]);

	if (taskErrors[taskId] > 20){
		//too many errors, stop paging
		taskErrors[taskId] = 0;
		console.log('***stop paging*** errors: ' + taskErrors[taskId]);
	}
	else {
		//errors could be accidental, keep paging
		setTimeout( function(){
			getTweetsFromURL(task, nextPage);
		}, 1000);
	}
}

function saveTweet(id, tweet, type){
	/*type key
	*	geo -- hadGeo -- had geo tweet element
	*	parse -- hadParse -- coordinates parsed from location element
	*	local -- hadLocal -- geocoded using local lookup
	*	geocode -- hadGeocode -- live geocoded
	*/

	var col = id.toString();

	var date = tweet.created_at;
	var epoch = new Date(date).getTime();
	tweet.epoch = epoch;

	db.collection(col).save(tweet, {safe:true}, function(err, saved) {
		if (err || !saved) {
			runningTasks[col].duplicates += 1;
			//error code 11000 - duplicate unique key
			if (err.code !== 11000) db.collection('errors').save({error: err, tweet: tweet});

			if (taskErrors[col]) taskErrors[col] += 1;
			else taskErrors[col] = 1;
		}
		else {
			runningTasks[col].count += 1;
			if (type === 'geo') runningTasks[col].hadGeo += 1;
			else if (type === 'parse') runningTasks[col].hadParse += 1;
			else if (type === 'local') runningTasks[col].hadLocal += 1;
			else if (type === 'geocode') runningTasks[col].hadGeocode += 1;
		}

		db.tasks.update({_id: id}, runningTasks[col], {}, function(err) {
		});
	});
}

function localLookup(task, tweet){
	var taskId = task._id.toString();

	geocoder.localLookup(db, tweet.location, function(err, places) {
		if (err || !places.length) {
			return geocodeTweet(task, tweet);
		}
		else {
			var placesInside = [];

			if (runningTasks[taskId].boundingBox){
				for (i in places){
					if (insideBoundingBox(places[i].latLon, runningTasks[taskId].boundingBox)){
						placesInside.push(places[i]);
					}
				}
			}
			else {
				placesInside = places;
			}

			if (placesInside.length > 0){
				var mostPopular = placesInside[0];
				for (i in placesInside){
					var place = placesInside[i];

					if (mostPopular.hits < place.hits)
						mostPopular = place;
				}
				tweet.latLon = mostPopular.latLon;
				saveTweet(task._id, tweet, 'local');

				mostPopular.hits += 1;
				db.collection('localGeocoder').update({_id: mostPopular._id}, mostPopular, {}, function(err) {
				});
				return true;
			}
			else return geocodeTweet(task, tweet);
		}
	});
}

function geocodeTweet(task, tweet){
	var taskId = task._id.toString();

	geocoder.geocode(tweet.location, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var geores = JSON.parse(body).candidates;

			if (geores.length === 0){
				//geocoder return no result -- tweet location is invalid
				runningTasks[taskId].discarded += 1;
				logInvalidTweet(tweet);
				return false;
			}
			else {
				//?????
				var found = false;

				for (i in geores){
					var location = geores[i];
					if (location.score > 99 && !found)
					{
						var coords = location.location;
						var latLon = [coords.y, coords.x];
						//check if tweet has bounding box
						if (runningTasks[taskId].boundingBox){
							//check if coords are in bounding box
							if (insideBoundingBox(latLon, runningTasks[taskId].boundingBox)){
								tweet.latLon = latLon;
								saveTweet(task._id, tweet, 'geocode');
								found = true;
								logGeocode(tweet.location, location);
								return true;
							}
							else {
								logDiscardedTweet(tweet, latLon, location.address);
							}
						}
						else {
							tweet.latLon = latLon;
							saveTweet(task._id, tweet, 'geocode');
							found = true;
							logGeocode(tweet.location, location);
							return true;
						}
					}
				}

				if (!found) {
					runningTasks[taskId].discarded += 1;
					logInvalidTweet(tweet);
					return false;
				}
			}
		}
		else {
			runningTasks[taskId].discarded += 1;
			console.log('error: ' + response.statusCode + ' ' + error);
			return false;
		}
	});
	return false;
}

function insideBoundingBox(latLon, bb){
	if (latLon[0] > bb.latMin &&
		latLon[0] < bb.latMax &&
		latLon[1] > bb.lonMin &&
		latLon[1] < bb.lonMax)
	{
		return true;
	}
	else {
		return false;
	}
}

function logGeocode(name, location){
	name = geocoder.cleanString(name);

	var newPlace = {
		place: name,
		latLon: [ location.location.y , location.location.x ],
		hits: 1
	}

	db.collection('localGeocoder').save(newPlace, function(err, saved){
	});
}

function logInvalidTweet(tweet){
	db.collection('invalid').save({place: tweet.location}, function(err, saved){
	});
}

function logDiscardedTweet(tweet, latLon, address){
	var place = geocoder.cleanLocation(tweet.location);
	db.collection('discarded').save({place: place, address: address, latLon: latLon}, function(err, saved){
	});
}

function objSize(obj){
	var c = 0;
	for (i in obj) c++;
	return c;
}