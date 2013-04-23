function startTask(id){
	$.ajax({
		type: "GET",
		url: "/data/" + id + "/start"
	}).done(function( data ) {
		result(data);
	});
}

function stopTask(id){
	$.ajax({
		type: "GET",
		url: "/data/" + id + "/stop"
	}).done(function( data ) {
		result(data);
	});
}

function deleteTask(id){
	$.ajax({
		type: "GET",
		url: "/data/" + id + "/delete"
	}).done(function( data ) {
		result(data);
		window.location.href = '/data';
	});
}

function result(data){
	var result = JSON.parse(data);
	if (result.error)
		$('#output').html('error: ' + result.error);
	else if (result.message)
		$('#output').html(result.message);
	else {
		console.log(result);
		$('#output').html('there was an unknown error');
	}
}