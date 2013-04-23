var request = require('request');
var db = require('./dataStore.js');

var keys = require('./keys.json');
/*
{ // my personal keys
	consumer_key: 'XqLnfDA3FE92QV8dHZFerQ',
	consumer_secret: 'KmI3cRAAGI7RHbzd1fAlBxGYX5lrjRHfkTW5YiaZE',
	token: '168988932-xYuJDPcTgfgaLjstrW8wAPeoEWYWC05xaFcS93OA',
	token_secret: 'Iy0dVjzys70b61TKNy9SuZz4dKnSJLewLfKaNE7jw'
};/* */
var oauth = {
	consumer_key: keys.consumer_key,
	consumer_secret: keys.consumer_secret,
	token: keys.oauth_token,
	token_secret: keys.oauth_token_secret
}

var taskr = require('./taskr.js');

var taskErrors = new Object();
var runningTasks = new Object();

var geocoder = require('./geocoder');

module.exports = {
	// start search task
	addTask: function(task, callback){
		//add to running tasks
		var id = task._id.toString()
		if ( runningTasks[id] ) callback("task already running");
		else runningTasks[id] = task;
		
		//start task
		searchByTask(task);
		if (callback) callback("task started");
	},
	// stop task
	removeTask: function(task, callback){
		delete runningTasks[task._id.toString()];
		if (callback) callback("task stopped");
	},
	testSearch: function(req, res){
		
	}
}

function searchByTask(task, callback){
	var url;
	if (task.refreshUrl){
		url = task.refreshUrl;
	}
	else{
		url = '?q=' + encodeURIComponent(task.query) + '&count=100';
		
		if (task.location && task.location.twitterStr){
			url += '&geocode=' + task.location.twitterStr;
		}
	}
	
	//perform search if task is running
	if (task.desiredTweets > task.stats.total && runningTasks[task._id.toString()]){
		console.log('searching: ' + task.query);
		
		searchRequest(task, url, callback);
		
		//set reccursion
		setTimeout( function(){
			console.log('refreshing search: ' + task.query);
			searchByTask(task);
		}, 60000 * task.interval);
	}
	else {
		console.log('tweet goal reached: ' + task.query);
		delete runningTasks[task._id.toString()];
	}
}

function searchRequest(task, url, callback){
	var searchURL = 'https://api.twitter.com/1.1/search/tweets.json' + url;
	
	request({url:searchURL, oauth:oauth}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			// returned valid results
			var resp = JSON.parse(body);
			var data = resp.statuses;
			var meta = resp.search_metadata;
			
			console.log(task.query + ': ' + data.length + ' tweets');
			
			task.refreshUrl = meta.refresh_url + '&count=100';
			
			//update task object
			task.stats.runCount += 1;
			task.stats.lastRun = new Date();
			
			saveTweets(data, task);
			
			if (meta.next_results){
				pagingTask(task, meta.next_results);
			}
			
			if (callback) callback(resp);
		}
		else{
			// returned error -- try again
			searchError(error, response, body, task);
		}
	});
}

function searchError(error, response, body, task){
	try{
		var ec = response.statusCode;
		//console.log('error: ' + ec + ' ' + error);
		if (ec === 500 || ec === 503 || ec === 502) {
			setTimeout( function(){
				searchByTask(task);
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
			searchByTask(task);
		}, 5000);
	}
}

function pagingTask(task, nextPageUrl){
	var taskId = task._id.toString();
	
	//page through remaining tweets -- if task is still running
	if ( runningTasks[taskId] && task.desiredTweets > task.stats.total )
	{
		console.log('next page: ' + task.query);
		
		//check for paging errors
		if (taskErrors[taskId] > 20){
			//too many errors, stop paging
			taskErrors[taskId] = 0;
			console.log('***stop paging*** errors: ' + taskErrors[taskId]);
		}
		else {
			//errors could be accidental, keep paging
			setTimeout( function(){
				searchRequest(task, nextPageUrl);
			}, 1000);
		}
	}
	
	//console.log(red + 'next page ' + response.next_page + reset);
	//pagingTask(task, response.next_page);
	//console.log('paging errors: ' + taskErrors[taskId]);
}

function saveTweets(data /* [] */, task){
	for (i in data){
		task.stats.mined += 1;
		
		var tweet = data[i];
		
		if (tweet.geo && tweet.geo.coordinates){
			//save coords -- real tweet coords
			tweet.latLon = tweet.geo.coordinates;
			saveTweet(task, tweet, 'coords');
		}
		else if(task.toSaveAll){
			//save tweet regardless of location
			saveTweet(task, tweet, null);
		}
		else if (tweet.user && tweet.user.location){
			//save string location
			//try to parce
			var latLon = geocoder.parse(tweet.user.location);
			if (latLon.length > 0){
				//save parsed location
				tweet.latLon = latLon;
				saveTweet(task, tweet, 'parsed');
			}
			else{
				//geocode
				geocoder.locate(tweet.user.location, task, tweet, function(location, resultType, thisTweet){
					if (location){
						thisTweet.latLon = location;
						saveTweet(task, thisTweet, resultType);
					}
					else if (resultType === 'discarded'){
						logDiscarded(thisTweet, task);
					}
					else console.log(argumetns);
				});
			}
		}
		else{
			//if nothing is a match, discard tweet
			task.stats.discarded += 1;
		}
	}
}

function saveTweet(task, tweet, locType){
	var epoch = new Date(tweet.created_at).getTime();
	tweet.epoch = epoch;
	
	var col = task._id.toString();

	db.collection(col).save(tweet, {safe:true}, function(err, saved) {
		if (err || !saved) {
			task.stats.duplicates += 1;
			//error code 11000 - duplicate unique key
			if (err.code !== 11000) db.collection('errors').save({error: err, tweet: tweet});

			if (taskErrors[col]) taskErrors[col] += 1;
			else taskErrors[col] = 1;
		}
		else {
			task.stats.total += 1;
			
			if (locType === 'coords') task.stats.coords += 1;
			else if (locType === 'parsed') task.stats.parsedCoords += 1;
			else if (locType === 'local') task.stats.localGeocode += 1;
			else if (locType === 'live') task.stats.liveGeocode += 1;
		}

		db.tasks.save(task, function(err){} );
	});
}

//temp
function logDiscardedTweet(tweet, latLon, address){
	var place = geocoder.cleanLocation(tweet.location);
	db.collection('discarded').save({place: place, address: address, latLon: latLon}, function(err, saved){
	});
}

function logDiscarded(tweet, task){
	task.stats.discarded += 1;
	db.tasks.save(task, function(err){} );
	
	//console.log('discarded: ' + tweet.user.location);
}
