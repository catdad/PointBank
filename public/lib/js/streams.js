function parseData(data){
	console.log(data);
	//var tasks = JSON.parse(data);
	var task;
	var code = '';
	
	code += "<div class='cardContainer'>";
	
	for (i in data){
		task = data[i];
		if ( runningTask === task._id.toString() )
			code += "<div class='card running'>";
		else
			code += "<div class='card'>";
		code += "<div class='cardContent'>";
		code += getTaskDisplay(task);
		code += "</div></div>"
	}
	
	code += "<div class='clear'></div>"
	code += "</div>";
	
	$('#tasks').html(code);
}

function getTaskDisplay(task){
	var code = '';
	code += "<div><b>Track term:</b> " + task.query + "</div>";
	code += "<div><b>Location:</b> " + (task.location || 'any') + "</div>";
	code += "<div><b>Tweet count:</b> " + task.count + "</div>";
	code += "<div><b>Total mined:</b> " + task.totalMined + "</div>";
	code += "<div><b>Efficiency:</b> " + (task.count / task.totalMined * 100).toFixed(2) + "%</div>";
	code += "<div><b>Last run on:</b> " + task.lastRun + "</div>";
	code += "<div><b>Duration:</b> " + secondsToTime(task.runTime) + "</div>";
	
	code += "<div><br/><b>Actions: </b>"
		+ "<a href='#' data-id='" + task._id.toString() + "' class='startTask' >Start</a> "
		+ "<a href='#' data-id='" + task._id.toString() + "' class='deleteTask' >Delete</a> ";
	code += "<br/><b>View: </b>";
	code += " <a href='/stream/html/" + task._id.toString() + "'>HTML</a>"
		+ " <a href='/stream/json/" + task._id.toString() + "'>JSON</a>"
		+ " <a href='/stream/esriJSON/" + task._id.toString() + "/query'>EsriJSON</a>";
	code += "<br/><b>Maps: </b>";
	code += "<a href='" + getMapLink(task) + "' target='_blank'>Map</a> ";
	var webGL = 'http://maps.esri.com/SP_DEMOS/html5/webglearth.html?url=';
	var arcgis = 'http://www.arcgis.com/home/webmap/viewer.html?url=';
	var url = document.location.origin + '/stream/esriJSON/' + task._id.toString();
	var url2 = document.location.origin + '/stream/json/' + task._id.toString();
	code += ' <a href=' + (arcgis + url) + ' target=_blank >ArcGIS Online</a>';
	code += ' <a href=' + (webGL + url2) + ' target=_blank >3D Globe</a>';
	code += '</div>';
	return code;
}

function getMapLink(task){
	var origin = document.location.origin;
	return '/public/map/index.html?limit=1000&url=' + origin + '/stream/json/' + task._id.toString();
}

function secondsToTime(sec){
	var hr = Math.floor(sec / 3600);
	var min = Math.floor((sec - (hr * 3600))/60);
	sec -= ((hr * 3600) + (min * 60));
	sec += ''; min += '';
	while (min.length < 2) {min = '0' + min;}
	while (sec.length < 2) {sec = '0' + sec;}
	//hr = (hr)?':'+hr:'';
	hr = (hr || '00');
	//return hr + "hr " + min + "min " + sec + "sec";
	return hr + ":" + min + ":" + sec;
}

$('.events').on('click', '.startTask', null, function(e){
	e.preventDefault();
	e.stopPropagation();
	
	var id = $(this).data('id');
	var link = this;
	
	$.ajax({
		type: 'GET',
		url: '/stream/start/' + id
	}).done(function( data ) {
		var result = JSON.parse(data);
		
		if (result.error) alert(result.error);
		else if (result.task) {
			alert('task started');
			$(link).parents('.card').each(function(){
				$(this).addClass('running');
			});
		}
		else alert('there was an unknown error');
	});
	
	return false;
});

$('.events').on('click', '.stopTask', null, function(e){
	e.preventDefault();
	e.stopPropagation();
	
	$('.card').each(function(){
		$(this).removeClass('running');
	});
	
	$.ajax({
		type: 'GET',
		url: '/stream/stop/'
	}).done(function( data ) {
		var result = JSON.parse(data);
		
		if (result.error) alert(result.error);
		else if (result.success) alert(result.success);
		else alert('there was an unknown error');
	});
	
	return false;
});

$('.events').on('click', '.deleteTask', null, function(e){
	e.preventDefault();
	e.stopPropagation();
	
	var id = $(this).data('id');
	
	$.ajax({
		type: 'GET',
		url: '/stream/drop/' + id
	}).done(function( data ) {
		var result = JSON.parse(data);
		
		if (result.error) alert(result.error);
		else if (result.deleted) {
			alert('deleted ' + result.deleted);
			window.location.reload();
		}
		else alert('there was an unknown error');
	});
	
	return false;
});

$('.events').on('click', '.createTask', null, function(e){
	//e.preventDefault();
	//e.stopPropagation();
	
	var query = $('#query').val();
	query = encodeURIComponent( query.replace(/\s+/g,'') );
	
	$.ajax({
		type: 'GET',
		url: '/stream/create?query=' + query
	}).done(function( data ) {
		var result = JSON.parse(data);
		
		if (result.error) alert(result.error);
		else if (result.task) {
			alert('created ' + result.task);
			window.location.reload();
		}
		else alert('there was an unknown error');
	}); /* */
	
	return false;
});

function upadteRunningTask(task){
	var code = "<div class='cardContent'>";
	code += getTaskDisplay(task);
	code += "</div>";
	$('.running').html(code);
}

//*** SOCKET.IO ***
var socket = io.connect(document.location.origin);
	socket.on('task', function (data) {
		upadteRunningTask(data);
	});