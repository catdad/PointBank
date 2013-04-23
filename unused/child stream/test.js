var Tuiter = require('tuiter');
var	keys = require('./keys.json');

var databaseUrl = 'test'; // "username:password@example.com/mydb"
var collections = ['stream'];
var db = require('mongojs').connect(databaseUrl, collections);

var fork = require('./fork');

exports.test = function(req, res){
	var t = new Tuiter(keys);
	var track = 'olympics';
	var location = [{lat: -90, long: -180},{lat: 90, long: 180}];
	
	var count = 0, time = 0;
	
	//t.filter({locations: [{lat: -90, long: -180},{lat: 90, long: 180}]}, function(stream){
	
	t.filter({track:"olympics"}, function(stream){
		// New tweet
		stream.on("tweet", function(data){
			count++;
			
			
			if(data.geo && data.geo.coordinates){
				db.collection('stream').save(data);
				if(data.text.toLowerCase().indexOf(track) > -1) search++;
			}
			if (data.coordinates) console.log(data);
		});
		
		stream.on('search', function(data){
			console.log(data);
		});
		stream.on('delete', function(data){
		
		});
		stream.on('error', function(data){
			console.log('error: ' + data);
		});
	});
	
	setInterval(function(){
		time++;
		console.log(time + ' seconds');
		console.log(count);
	}, 1000)
	
	res.send('stream started');
};

exports.testPrint = function(req, res){
	db.collection('stream').find({}, function(err, tweets){
		res.send({count: tweets.length, results: tweets});
	}).limit(50);
}