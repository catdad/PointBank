var Tuiter = require('tuiter');
var keys = require('./keys.json');
var oauth = {
	consumer_key: keys.consumer_key,
    consumer_secret: keys.consumer_secret, 
    access_token_key: keys.oauth_token,
    access_token_secret: keys.oauth_token_secret
}

var streamer = new Tuiter(oauth);

var db = require('./dataStore.js');
var runningTasks = new Object();

var taskr = require('./taskr');

module.exports = {
	// start search task
	addTask: function(task, callback){
		//start task
		streamByTask(task);
		if (callback) callback("task started");
	},
	// stop task
	removeTask: function(task, callback){
		//save task to db
		taskr.upsert(task, function(){
			//remove task from globalStream
			globalStream.track.remove(task);
			if (callback) callback("task stopped");
		});
	},
	test: function(req){
		streamByTask({query: req.query.q, count: 0});
		req.res.send({streaming: globalStream.track.array()});
	}
}

function onData (tweet, task){
	task.stats.mined += 1;
	console.log(task.query + ': ' + task.count);
}

var globalStream = {
	stream: null,
	track: {
		tasks: {},
		add: function trackAdd(task){
			this.tasks[task.query] = task;
		},
		remove: function trackRemove(task){
			//delete from running tasks
			delete that.tasks[task.query];
		},
		get: function trackGet(idx){
			return this.tasks[idx];
		},
		array: function trackArray(){
			var arr = [];
			for (i in this.tasks){
				arr.push(i);
			}
			return arr;
		}
	},
	callback: function streamCallback(stream){
		var that = this;
		console.log('stream callback');
		this.stream = stream;
		
		console.log(this.onData);
		if (this.onData){
			console.log('setting tweet action');
			stream.on('tweet', function(tweet){
				that.match(tweet, that.onData);
			});
		}
		stream.on('search', function(data){});
		stream.on('delete', function(data){});
		stream.on('error', function(data){});
	},
	create: function(onData){
		var that = this;
		console.log(this);
		
		//save 
		if (onData) this.onData = onData;
		
		//start new stream
		streamer.filter({track: this.track.array()}, function(stream){
			console.log('anonymous callback');
			that.callback(stream);
		});
	},
	remove: function(task){
		
	},
	destroy: function(){
		if (this.stream) this.stream.end;
	},
	update: function(newTask){
		if (newTask) this.track.add(newTask);
		
		if (this.stream){
			this.stream.emit('end');
			this.create();
		}
	},
	match: function(tweet, callback){
		var that = this;
		var tasks = this.track.array();
		tasks.forEach(function(val, idx, arr){
			if (tweet.text.indexOf(val) > -1){
				//tweet has required query
				callback(tweet, that.track.get(val) );
			}
		})
	}
};

function streamByTask(task){
	//start stream
	
	globalStream.track.add(task);
	
	if (globalStream.stream){
		//stream exists, upadte
		globalStream.update(task);
	}
	else{
		//no stream, create one
		globalStream.create(onData);
	}
	/* */
}
