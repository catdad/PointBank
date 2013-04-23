function submitImport(){
	var importUrl = O('url').value;
	if (!importUrl) {
		alert('please enter a URL');
		return false;
	}
	
	$.ajax({
		type: "POST",
		url: "/twitter/import",
		data: { url: importUrl }
	}).done(function( data ) {
		data = JSON.parse(data);
		var result = '';
		
		if (data.error) result = 'error: ' + data.error;
		else if (data.success) result = data.success;
		else result = 'unknonw error';
		
		$("#output").html(result);
	});
	/* */
}

$("#import").click(function(){
	submitImport();
});