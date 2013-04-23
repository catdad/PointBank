var speak = require('speakeasy-nlp');
var url = require('url');
var config = require('./config.json');
var databaseUrl = config.dbName; // "username:password@example.com/mydb"
var db = require('mongojs').connect(databaseUrl);

exports.sentiment = function(req, res){
	var id = req.params.id;
	console.log(id);
	
	db.collection(id).find({}, function(err, tweets){
		var tweet;
		for (i in tweets){
			tweet = tweets[i];
			if (!tweet.sentiment){
				var sent = speak.sentiment.analyze(tweet.text);
				tweet.sentiment = sent;
				
				//optimized, but untested function
				//db.collection(id).save(tweet); //upsert command
				
				db.collection(id).update({_id: tweet._id}, tweet, function(err){
				
				});
			}
		}
		
		res.render('sentimentsView.jade', {
			locals: { title: 'Sentiments', data: tweets }
		});
	}).limit(0);
}