var Tuiter = require('tuiter');
var	keys = require('./keys.json');

//db setup
var config = require('./config.json');
var databaseUrl = config.dbName; // "username:password@example.com/mydb"
var collections = ['tasks'];
var db = require('mongojs').connect(databaseUrl, collections);

process.on('message', function(m){
	console.log('child: ' + m);
	if (m === 'start') startStream();
	if (m === 'stop') {}
	process.send({result: 'message from child'});
});

process.on('error', function(e){
	console.log('child error: ' + e);
});

process.on('SIGHUP', function(){
	console.log('received SIGHUP');
	process.exit();
});

//start streaming task
var time = 0;
var count = 0;

function startStream(){
	var t = new Tuiter(keys);
	var track = 'olympics';
	var location = [{lat: -90, long: -180},{lat: 90, long: 180}];
	
	//t.filter({locations: [{lat: -90, long: -180},{lat: 90, long: 180}]}, function(stream){
	
	t.filter({track: track}, function(stream){
		
		
		// New tweet
		stream.on("tweet", function(data){
			count++;
			
			if (data.geo && data.geo.coordinates){
				db.collection('stream').save(data);
				if(data.text.toLowerCase().indexOf(track) > -1) search++;
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
	});
	
	startTimer();
}

function startTimer(){
	setInterval(function(){
		time++;
		console.log(time + ' seconds');
		console.log(count);
	}, 1000)
}