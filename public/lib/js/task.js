function parseTasks(task){
	console.log(task);
	
	console.log($(document).width() );
	if ( $(document).width() > 720 )
		loadIFrame(task._id.toString());
	else destroyIFrame();
	
	var nd = 'Not defined';
	var code = '';
	
	code += "<div class='title'>";
	code += "<span class='label'>Data topic: </span>";
	
	if (task.compilation)
		code += "<div class='data' " + style(task.query.join(' / ')) +  ">" + task.query.join(' / ') + "</div>";
	else
		code += "<div class='data' " + style(task.query) +  ">" + task.query + "</div>";
	
	code += "</div>";
	
	$("#task").html(code);
	code = '';
		
	code += "<span class='label'>Total points: </span>";
	code += "<span class='data'>" + task.stats.total + "</span>";
	code += "<br/><span class='label'>Efficiency: </span>";
	code += "<span class='data'>" + round((task.stats.total / task.stats.mined) * 100 || 0) + "%</span>";
	code += "<br/><span class='label'>Location: </span>";
	code += "<span class='data'>" + task.location.name + "</span>";
	
	code += "<br/>";
	
	code += "<br/><span class='label'>Collection type: </span>";
	code += "<span class='data'>Search</span>";
	code += "<br/><span class='label'>Total limit: </span>";
	code += "<span class='data'>" + task.desiredTweets + "</span>";
	code += "<br/><span class='label'>Interval: </span>";
	code += "<span class='data'>" + task.interval + " min.</span>";
	code += "<br/><span class='label'>Run count: </span>";
	code += "<span class='data'>" + task.stats.runCount + " times</span>";
	code += "<br/><span class='label'>Last run: </span>";
	code += "<span class='data'>" + (task.stats.lastRun || 'never') + "</span>";
	code += "<br/><span class='label'>Location center: </span>";
	code += "<span class='data'>[" + task.location.center.lat + ', ' + task.location.center.lon + "]</span>";
	code += "<br/><span class='label'>Radius: </span>";
	code += "<span class='data'>" + task.location.center.radius + task.location.center.unit +  "</span>";
	
	code += "<br/>";
	
	code += "<br/><span class='label'>Total points: </span>";
	code += "<span class='data'>" + (task.stats.mined || 0) + "</span>";
	code += "<br/><span class='label'>Coordinates: </span>";
	code += "<span class='data'>" + (task.stats.coords || 0) + "</span>";
	code += "<br/><span class='label'>Parsed coordinates: </span>";
	code += "<span class='data'>" + (task.stats.parsedCoords || 0) + "</span>";
	code += "<br/><span class='label'>Local geocode: </span>";
	code += "<span class='data'>" + (task.stats.localGeocode || 0) + "</span>";
	code += "<br/><span class='label'>Live geocode: </span>";
	code += "<span class='data'>" + (task.stats.liveGeocode || 0) + "</span>";
	
	code += "<br/>";
	
	code += "<br/><span class='label'>Discarded points: </span>";
	code += "<span class='data'>" + (task.stats.discarded || 0) + "</span>";
	code += "<br/><span class='label'>Duplicate points: </span>";
	code += "<span class='data'>" + (task.stats.duplicates || 0) + "</span>";
	code += "<br/><span class='label'>Total mined: </span>";
	code += "<span class='data'>" + (task.stats.mined || 0) + "</span>";
	
	code += "<br/>";
	
	code += "<br/><span class='label'>Task ID: </span>";
	code += "<span class='data'>" + task._id.toString() + "</span>";
	
	$("#data").html(code);
	code = '';
	
	/* location if statement
	if (task.location){
		if (task.location.length){
			code += "<br/>Location: ";
			for (i in task.location){
				var l = task.location[i];
				code += "[" + l.lat + ", " + l.lon + "] radius: " + l.radius;
				code += " / ";
			}
		}
		else 
			code += "<br/>Location: [" + task.location.lat + ", " + task.location.lon + "] radius: " + task.location.radius;
	} /* */
	
	
	code += "<div class='label'>Actions:</div>";
	code += '<div class=block>';
	code += "<button onClick='startTask(\"" + task._id + "\");'>Start</button>";
	code += "<button onClick='stopTask(\"" + task._id + "\");'>Stop</button>";
	code += "<button onClick='deleteTask(\"" + task._id + "\");'>Delete</button>";
	code += "<div id='output'></div>";
	code += '</div>';

	$('#actions').html(code);
	code = '';

	var origin = document.location.origin;
	var url = origin + '/twitter/json/' + task._id.toString();
	//var url = origin + '/data/' + task._id.toString() + '/query?f=json';
	var arcURL = origin + '/twitter/esriJSON/' + task._id.toString();
	
	var webGL = 'http://maps.esri.com/SP_DEMOS/html5/webglearth.html?url=' + url;
	var arcgis = 'http://www.arcgis.com/home/webmap/viewer.html?url=' + arcURL;
	var map = origin + '/public/map/index.html?limit=900&url=' + url;
	var google = '#';
	
	code += "<div class='label'>Data visualization:</div>";
	code += '<a href=' + (map) + ' target=_blank ><img src=/public/img/map.png /></a>';
	code += '<a href=' + (google) + ' data-target=_blank ><img src=/public/img/google.png /></a>';
	code += '<a href=' + (arcgis) + ' target=_blank ><img src=/public/img/arcgis.png /></a>';
	code += '<a href=' + (webGL) + ' target=_blank ><img src=/public/img/webgl.png /></a>';
	
	$('#viz').html(code);
	code = '';
	
	code += "<div class='label'>Data portal:</div>";
	code += "<button class='large' >Query Data</button>";
	
	$('#portal').html(code);
	code = '';
	
	code += "<div class='label'>Data:</div>";
	code += '<a href=/twitter/html/' + task._id.toString() + ' >HTML</a>';
	code += '<a href=/twitter/json/' + task._id.toString() + ' >JSON</a>';
	code += '<a href=/twitter/esriJSON/' + task._id.toString() + '/query >EsriJSON</a>';
	
	code += '<br/><b>Enrichments:</b> ';
	code += " <a href='/enrich/" + task._id + "' target='_blank' />Sentiment</a>";
	
	//code += '</div>';

	O('extra').innerHTML = code;
	code = '';
	//document.write(code + '<br/><br/>');
}

function round(num){
	return (Math.round(num * 100) / 100);
}

function style(str){
	if (str.length < 10) return "style='font-size: 3em;'";
	else return "style='font-size: 2em;'";
	//else if (str.length < 25) return "style='font-size: 1.8em;'";
	//else return ""; //"style='font-size: 1em;'";
}

function loadIFrame(url){
	url = document.location.origin + '/twitter/json/' + url;
	O('map').src = "/public/map/index.html?" +
				   "limit=900&url=" + url;
}
function destroyIFrame(){
	var frame = S('map');
	frame.height = '0px';
	frame.margin = '0';
	frame.padding = '0';
}