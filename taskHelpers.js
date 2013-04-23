/*
 * This file holds common data retrieval functions (from twitter.js and stream.js)
 *
*/

var url = require('url');
var header = require('./headers');

var Proj4js = require('proj4js');
var proj_dd = new Proj4js.Proj('EPSG:4236');
var proj_mercator = new Proj4js.Proj('EPSG:3875');

//function used elsewhere to return any JSON object
exports.JSON = function(res, obj, callback /* override */){
	returnJSON(res, obj, callback);
}

exports.send = function(res, view, locals){
	if (view === 404) return404(res, locals /* error object */);
	else{	
		if (res.req.query.f === 'json' || !view){
			returnJSON(res, (locals.data)? locals.data : locals, (res.req.query.callback || null));
		}
		else{
			res.render(view, {
				locals: locals
			});
		}
	}
}

exports.retrieveTweets = function(db, req, res, task, format, callback){
	//get params for query
	var params = getParams(req);
	params.format = format;
	
	var q = {}; //mongoDB query in JSON format
	var query = null;

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

	console.log(q);
	db.collection(task._id.toString()).find(q, function(err, tweets) {
		if (err || !tweets.length) {
			if (params.format === 'json')
				returnJSON(res, {error: 'no tweets found'}, callback, null);
			else
				res.send('no tweets found ' + err);
		}
		else {
			console.log('found: ' + tweets.length);

			if (params.format === 'json'){
				if (params.detailed === false)
					tweets = shortenTweets(tweets);

				returnJSON(res, {meta: task, count: tweets.length, results: tweets}, callback);
			}
			else if (params.format === 'esriJSON'){
				var outSR = (url.parse(req.url, true).query.outSR || null);
				var result = convertToEsriJSON( shortenTweets(tweets), outSR );
				returnJSON(res, result, callback);
			}
			else
				res.send( convertToHTML(tweets) );
		}
	}).sort( { epoch : params.order } ).limit(params.limit || 0);
}

//************* ESRI JSON ***********************
function project(point, wkid){
//var project = function(point, wkid){
	var epsg;
	// wkid will be a string
	if (wkid == 102100 || wkid == 102113 || wkid == 3857) epsg = 3857;
	else if (wkid == 4326) return false;
	else epsg = 4139;
	
	//console.log('epsg: ' + epsg);
	
	try{
		var p = new Proj4js.Point(point[0],point[1]);  
		var newp = Proj4js.transform(proj_dd, proj_mercator, p)
		return [newp.x, newp.y];
	}
	catch(e){
		console.log(e);
		return false;
	}
} /* */

function getFields(){
	//hardcoded fields in a task -- used for esriJSON
	return [{
				"name" : "id",
				"type" : "esriFieldTypeOID"
			}, {
				"name" : "created_at",
				"type" : "esriFieldTypeString",
				"alias" : "Created",
				"length" : 1073741822
			}, {
				"name" : "epoch",
				"type" : "esriFieldTypeDate",
				"alias" : "epoch"
			}, {
				"name" : "from_user",
				"type" : "esriFieldTypeString",
				"alias" : "User",
				"length" : 1073741822
			}, {
				"name" : "from_user_name",
				"type" : "esriFieldTypeString",
				"alias" : "UserName",
				"length" : 1073741822
			}, {
				"name" : "location",
				"type" : "esriFieldTypeString",
				"alias" : "Location",
				"length" : 1073741822
			}, {
				"name" : "text",
				"type" : "esriFieldTypeString",
				"alias" : "Text",
				"length" : 1073741822
			}, {
				"name" : "profile_image_url",
				"type" : "esriFieldTypeString",
				"alias" : "ProfileImage",
				"length" : 1073741822
			}];
}

exports.describeEsriTask = function(req, res){
	var fields = getFields();
	var serviceDefinition = {
		"currentVersion":10.0,
		"id":0,
		"name":"Tweets",
		"type":"Feature Layer",
		"description":"",
		"definitionExpression":"",
		"geometryType":"esriGeometryPoint",
		"copyrightText":"",
		"parentLayer":{}, //{"id":2,"name":"Counties"},
		"subLayers":[],
		"defaultVisibility":true,
		"extent":{
			"xmin": -180,
			"ymin": -83.1601294389999,
			"xmax": 180,
			"ymax": 90,
			"spatialReference":{"wkid":4326}
		},
		"hasAttachments":false,
		"htmlPopupType":"esriServerHTMLPopupTypeNone",
		"drawingInfo":{
			renderer: {
			type: "simple",
			symbol: {
				type: "esriSMS",
				style: "esriSMSCircle",
				color: [
						255,
					255,
					0,
					255
				],
				size: 8,
				angle: 0,
				xoffset: 0,
				yoffset: 0,
				outline: {
				color: [
					0,
					0,
					0,
					255
				],
				width: 1
				}
			},
			label: "",
			description: ""
			},
			transparency: 0,
			labelingInfo: null
		},
		"displayField":"Name",
		"fields": fields,
		"globalIdField" : "id",
		"displayField" : "from_user",
		"typeIdField" : null,
		"types" : null,
		"relationships":[],
		"capabilities":"Query" //"Map,Query,Data"
	};
	
	returnJSON(res, serviceDefinition, (url.parse(req.url, true).query.callback || null));
}

function convertToEsriJSON(tweets, wkid){
	console.log('**** outSR: ' + wkid + ' ****');
	console.log('converting tweets');
	var results = [];
	
	for (i in tweets){
		var tweet = tweets[i];
		var result = {};
	
		var point = [ tweet.latLon[1], tweet.latLon[0] ];

		if (wkid && wkid != 'undefined'){
			var newPoint = project(point, wkid);
		} /* */
		
		if (newPoint) {
			point = newPoint;
		}
		
		//result.geometry = {x: tweet.latLon[1], y: tweet.latLon[0]};
		result.geometry = {x: point[0], y: point[1]};
		result.attributes = tweet;
		results.push(result);
	}
	
	console.log('creating return object');
	
	var fields = getFields();
	var obj = {
		objectIdFieldName: "id",
		globalIdFieldName: "",
		geometryType: "esriGeometryPoint",
		spatialReference: { wkid: parseInt(wkid) },
		fields: fields,
		features: results 
	}
	
	return obj;
}
//************* END ESRI JSON *******************

function convertToHTML(tweets){
	var code = tweets.length + ' tweets<br/>';
	for (i in tweets){
		var tweet = tweets[i];

		code += '<hr/><div>';
		code += '<img src=' + tweet.profile_image_url + ' />';
		code += '<b> ' + tweet.from_user_name + '</b>  <i>@' + tweet.from_user + '</i>';
		code += '<br/><p>' + tweet.text + '</p>';
		code += 'geo: ' + JSON.stringify(tweet.geo) + '<br/>';
		code += 'location: ' + tweet.location + '<br/>';
		code += 'latLon: ' + JSON.stringify(tweet.latLon) + '<br/>';
		code += 'id: ' + tweet._id + '<br/>';
		code += 'epoch: ' + (tweet.epoch || 'not defined') + '<br/>';
		code += 'created: ' + tweet.created_at;
		code += '</div>';
		//code += '<p><small>' + JSON.stringify(tweet) + '</small></p>';
	}
	return code;
}

function getParams(req){ //parameters from Tweet endpoint queries
	var data = url.parse(req.url, true).query;
	
	var limit = Number(data.limit);
	var from_id = data.from_id || null;
	var near = data.near || null;
	var start_time = Number(data.start_time) || null;
	var end_time = Number(data.end_time) || null;
	var detailed = (data.detailed === 'true');

	var order = data.order;
	if (order === 'a') order = 1;
	else order = -1;

	if (limit === 0) {
		limit = 0;
	}
	else if (!limit){
		limit = 100;
	}

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

function shortenTweets(tweets){
	var shortTweets = [];
	for (i in tweets){
		var tweet = tweets[i];
		var shortTweet = new Object();
		shortTweet._id = tweet._id;
		shortTweet.id = tweet.id;
		shortTweet.epoch = tweet.epoch;
		shortTweet.latLon = tweet.latLon;
		
		shortTweet.text = tweet.text;
		shortTweet.created_at = tweet.created_at;
		
		if (tweet.profile_image_url)
			shortTweet.profile_image_url = tweet.profile_image_url;
		else 
			shortTweet.profile_image_url = tweet.user.profile_image_url
		
		if (tweet.from_user_name)
			shortTweet.from_user_name = tweet.from_user_name;
		else
			shortTweet.from_user_name = tweet.user.name;
			
		if (tweet.from_user)
			shortTweet.from_user = tweet.from_user;
		else
			shortTweet.from_user = tweet.user.screen_name
		
		shortTweets.push(shortTweet);
	}
	return shortTweets;
}

//function to return any JSON object
function returnJSON(res, obj){
	var callback = res.req.query.callback;
	var j = JSON.stringify(obj);

	if (callback){
		j = callback + '(' + j + ')';
	}

	header.json(res, j);
	//res.send(j, { 'Content-Type': 'text/plain' });
	//res.end(j);
}

function return404(res, obj){
	if (res.req.query.f === 'json'){
		obj.status = 404;
		returnJSON(res, obj);
	}
	else{
		res.render('404.jade', {
			locals: {
				title: 'Page not found',
				data: obj
			}
		});
	}
}
