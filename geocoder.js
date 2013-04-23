var request = require('request');
var async = require('async');
//var header = require('./headers');
var db = require('./dataStore.js');

var blue = '\033[34m';
var reset = '\033[0m';

var locateMemo;

module.exports = {
	init: function(){
		//insure index on local db
		db.collection('localGeocoder').ensureIndex({ latLon: "2d" }, { background: true });
		
		//set up memoize
		locateMemo = async.memoize(doLocate);
		
		return this;
	},
	locate: function(place, task, tweet, callback){
		locateMemo(place, task, tweet, callback);
	},
	
	//old functions
	parse: function(location, res){
		var loc = parse(location);
		if (loc.length > 0) console.log(blue + JSON.stringify(loc) + reset);
		return loc;
	},
	geocode: function(str, callback){
		//check fro str in local database
			//if found, return location
			//else, store in db, return null, and live-geocode later
		str = cleanUp(str);
		geocode(str, callback);
	},
	localLookup: function(db, str, callback){
		str = cleanUp(str);
		db.collection('localGeocoder').find({place: str}, callback);
	},
	cleanLocation: function(str){
		return cleanUp(str);
	},
	
	//test functions
	local: function(res){
		var str = cleanUp(res.req.query.q);
		console.log(str);
		
		doLocal(cleanUp(str), null, function(err, body){
			res.send(body);
		});
	},
	live: function(res){
		var str = cleanUp(res.req.query.q);
		console.log(str);
		
		doLive(cleanUp(str), null, function(err, body){
			res.send(body);
		});
	},
	
	test: function(task, str, res){
		
	}
}

function doLocate(place, task, tweet, callback){
	var str = cleanUp(place);
	
	doLocal(str, task, function(err, places){
		if (err || !places.length) {
			//invalid local lookup -- do live lookup
			doLive(str, task, function(err, places){
				if (err || !places.length){
					//either error or no places returned
					if (err) console.log(err);
					else console.log('no results: ' + str);
					
					callback(null, 'discarded', tweet); //return no values
				}
				else{
					//set worse scenario values
					var found = false;
					var loc = null;
					var type = 'discarded';
					
					places.forEach(function(el, idx, arr){
						if (el.score > 99){
							var latLon = [el.location.y, el.location.x];
							
							//check for location in task
							if (task.location){
								//there is a location
								//filter values based on bounding box
								if ( insideBoundingBox(latLon, task.location.boundingBox) && !found ){
									//set values
									found = true;
									loc = latLon;
									type = 'live';
									
									//save to Local for later use (only if hit)
									saveToLocal(str, el.address, latLon);
								}
							}
							else{
								//there is no location
								//take the first value
								
								//set values
								found = true;
								loc = latLon;
								type = 'live';
								
								//save to Local for later use (only if hit)
								saveToLocal(str, el.address, latLon);
							}
						}
					});
					
					//send back results or default values
					if (!found) console.log(places.length + ' results outside: ' + str);
					callback(loc, type, tweet);
				}
			});
		}
		else{
			//valid local lookup
			var mostPopular = places[0];
			mostPopular.hits += 1;
			db.collection('localGeocoder').save(mostPopular);
			
			callback(mostPopular.latLon, 'local', tweet);
		}
	});
}

function doLocal(place, task, callback){
	var query = {};
	query.place = place;
	
	if (task){
		query.latLon = {
			'$near': task.location.db.near,
			'$maxDistance': task.location.db.maxDistance
		} /* */
	}
	
	db.collection('localGeocoder').find(query, callback).sort({hits: -1});
}

function doLive(place, task, callback){
	var url = 'http://tasks.arcgis.com/ArcGIS/rest/services/WorldLocator/GeocodeServer/findAddressCandidates?'
			+ 'SingleLine=' + encodeURIComponent(place)
			+ '&outFields=' + encodeURIComponent('') //'*' for all fields
			+ '&outSR=' + '&f=json';

	request(url, function(err, response, body){
		callback(err, JSON.parse(body).candidates);
		/*
		.forEach(function(el, idx, arr){ 
			
		});
		*/
	});
}

function insideBoundingBox(latLon, bb){
	return (latLon[0] > bb.latMin &&
		latLon[0] < bb.latMax &&
		latLon[1] > bb.lonMin &&
		latLon[1] < bb.lonMax) ? true:false;
}

function saveToLocal(name, address, latLon){
	var loc = {
		place: cleanUp(name),
		address: address,
		latLon: latLon,
		hits: 1
	}
	
	db.collection('localGeocoder').save(loc);
}

var lookup = function(req, res){
	var url = require('url');
	var request = url.parse(req.url, true);
	var query = request.query;
	var common = require('./taskHelpers');

	if (!query.q) common.JSON(res, {r: 'no query found'});
	else
	geocode(query.q, function (error, response, body){
		if (!error && response.statusCode == 200) {
			var geores = JSON.parse(body).candidates;

			if (geores.length === 0){
				common.JSON(res, {error: 'nothing found'});
			}
			else{
				common.JSON(res, {results: geores});
			}
		}
		else {
			common.JSON(res, {error: 'error: ' + response.statusCode + ' ' + error});
		}
	});
}

function cleanUp(str){
	//str = str.replace(/[^a-zA-Z ]/g, ' ');

	//known bug -- this does not accept accented characters
	
	//only accept letters, numbers, and whitespace
	str = str.replace(/[^A-Za-z0-9\s]/g, ' ');
	//remove leading and trailing spaces
	str = str.replace(/^\s+/, '');
	str = str.replace(/\s+$/, '');
	//replace multiple spaces with just 1
	str = str.replace(/\s+/, ' ');
	return str;
}

function geocode(str, callback){
	var url = 'http://tasks.arcgis.com/ArcGIS/rest/services/WorldLocator/GeocodeServer/findAddressCandidates?'
			+ 'SingleLine=' + encodeURIComponent(str)
			+ '&outFields=' + encodeURIComponent('')
			+ '&outSR=' + '&f=json';

	request(url, callback);
}

function parse(location){
	var finalLoc = [];

	if (location.indexOf('iPhone:') > -1) {
		location = location.slice(7);
		var loc2 = location.split(',');
		finalLoc = [parseFloat(loc2[0]), parseFloat(loc2[1])];
		//return finalLoc;
	}
	else if (location.indexOf('ÃœT:') > -1 || 
			 location.indexOf('ï¿½T:') > -1 || 
			 location.indexOf('ÜT') > -1 ) { //'ÜT:' or 'ï¿½T:'
		location = location.slice(3);
		var loc3 = location.split(',');
		finalLoc = [parseFloat(loc3[0]), parseFloat(loc3[1])];
		//return finalLoc;
	}
	else if (location.indexOf('Pre:') > -1) {
		location = location.slice(4);
		var loc4 = location.split(',');
		finalLoc = [parseFloat(loc4[0]), parseFloat(loc4[1])];
		//return finalLoc;
	}
	else if (location.split(',').length == 2) {
		var loc5 = location.split(",");
		if (loc5.length == 2 && parseFloat(loc5[1]) && parseFloat(loc5[0])) {
			var lat = parseFloat(loc5[0]),
				lon = parseFloat(loc5[1]);
			
			if (loc5[0].indexOf('N') > -1) lat = lat * 1; //coord is positive
			else if (loc5[0].indexOf('S') > -1) lat = lat * -1; //coord is negative
			
			if (loc5[1].indexOf('E') > -1) lon = lon * 1; //coord is positive
			else if (loc5[1].indexOf('W') > -1) lon = lon * -1; //coord is negative
			
			finalLoc = [lat, lon];
			//return finalLoc;
		}
		else {
			//console.log('not found: ' + location);
		}
	}
	else {
		//console.log('not found: ' + location);
	}
	
	//test if location is valid
	if (parseFloat(finalLoc[0]) && parseFloat(finalLoc[1]))
		return finalLoc;
	else
		return [];

	// ï¿½T: 41.752898,-87.699923
	//return finalLoc;
}