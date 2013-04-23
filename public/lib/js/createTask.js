function checkForCompleteLocation(){
	var lat = document.getElementById('lat').value;
	var lon = document.getElementById('lon').value;
	var radius = document.getElementById('radius').value;
	var radMi = document.getElementById('radMi').checked;
	var radKm = document.getElementById('radKm').checked;

	if (lat !== '' && lon !== '' && radius !== '' && (radMi || radKm)){
		enableLocation();
	}
	else disableLocation();
}

function enableLocation(){
	$('#geocode').removeAttr('disabled');
}

function disableLocation(){
	$('#geocode').attr('checked', false).attr('disabled', true);
}

function parseGeocoderResults(res){
	var code = '<br/>';
	if (res.error){
		O('lookupResult').innerHTML = '<br/>' + res.error;
	}
	else if (res.results){
		var results = res.results;
		for(i in results){
			var place = results[i];
			code += "<a href='#' data-lat='" + place.location.y + "' data-lon='" + place.location.x + "' class='loc' >";
			code += place.address;
			code += "</a><br/>";
		}
		O('lookupResult').innerHTML = code;
	}
	else {
		O('lookupResult').innerHTML = '<br/>there was an unknown error';
	}
}

$("#submit").click(function(){
	var term = document.getElementById('term').value;
	var tweets = document.getElementById('tweets').value;
	var interval = document.getElementById('interval').value;

	var lat = document.getElementById('lat').value;
	var lon = document.getElementById('lon').value;
	var radius = document.getElementById('radius').value;
	var radMi = document.getElementById('radMi').checked;
	var radKm = document.getElementById('radKm').checked;
	var geo = document.getElementById('geo');
	var geocode = document.getElementById('geocode');

	var location = false;
	var radiusUnit;

	if (lat != '' && lon != '') {
		//valid lat and lon
		if (radMi) radiusUnit = 'mi';
		else if (radKm) radiusUnit = 'km';
		else {
			alert('please select a radius unit');
			return false;
		}
		location = true;
	}
	else {
		location = false;
	}

	if (!(term === '' || tweets === '' || interval === '')){
		//create task
		$.ajax({
			type: "POST",
			url: "/twitter/new",
			data: { term: term,
					tweets: tweets,
					interval: interval,
					lat: lat,
					lon: lon,
					radius: radius,
					radiusUnit: radiusUnit,
					location: location,        // T/F
					geo: geo.checked,          // T/F
					geocode: geocode.checked   // T/F
				}
		}).done(function( data ) {
			var result = JSON.parse(data);
			if (result.error) $('#output').html('task id: ' + result.error);
			else if (result.id) window.location = '/twitter/task/' + result.id; //$('#output').html('task id: ' + result.id);
			else $('#output').html('there was an unknown error');
		});
	}
	else alert('all boxes are required');
});

$('#find').click(function(e){
	e.preventDefault();
	var query = O('address').value;
	if(query !== ''){
		$.ajax({
			type: "GET",
			url: "/lookup?q=" + query
		}).done(function( data ) {
			var result = JSON.parse(data);
			parseGeocoderResults(result);
		});
	}
	else O('lookupResult').innerHTML = 'enter a location to look up';
});

$('.loc').live('click', function(e){
	e.preventDefault();
	O('lat').value = $(this).data('lat');
	O('lon').value = $(this).data('lon');
});

$('#lat').change(function(){
	checkForCompleteLocation();
});
$('#lon').change(function(){
	checkForCompleteLocation();
});
$('#radius').change(function(){
	checkForCompleteLocation();
});
$('#radMi').change(function(){
	checkForCompleteLocation();
});
$('#radKm').change(function(){
	checkForCompleteLocation();
});

$('#lookup').click(function(){
	$('#lookupHidden').toggle();
	O('address').focus();
});
