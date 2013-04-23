function parseData(tasks){
	var code = '';
	for (i in tasks){
		var task = tasks[i];
		code += "<p>";

		code += "<div class='block margin'><input type='checkbox' name='task' value='" + task._id.toString() + "' /></div>";
		code += "<div class='block'>";

		if (task.compilation)
			code += 'compilation -- ' + ( task.query.join(' / ') ) + ' -- count: ' + task.count + '/' + task.totalTweets;
		else
			code += task.query + ' -- count: ' + task.count + '/' + task.totalTweets;
		code += '<br/><a href=/twitter/task/' + task._id.toString() + ' >Details</a> ';

		code += "</div>";
		code += '</p>';
	}
	O('tasks').innerHTML = code;
}

function compileTasks(){
	var tasks = [];
	var urls = [];
	$('input[name=task]:checked').each(function(){
		tasks.push(this.value);
		this.checked = false;
	});
	$('input[name=importURL]').each(function(){
		urls.push(this.value);
	});
	$("#urls").html('');

	if ((tasks.length === 0) && (urls.length === 0)) {
		alert('please select tasks');
		return false;
	}

	$.ajax({
		type: "POST",
		url: "/twitter/compilation",
		data: { tasks: tasks, urls: urls }
	}).done(function( data ) {
		data = JSON.parse(data);
		var result = '';

		if (data.error) result = 'error: ' + data.error;
		else if (data.success) result = data.success;
		else result = 'unknonw error';

		console.log(result);
		$("#output").html(result);
	}); /* */
}

$("#compile").click(compileTasks);
$("#addUrl").click(function(){
	var code = "<input type='text' name='importURL' style='width: 100%;' placeholder='http://...' /><br/>";
	$(this).html('Add More URLs');
	$("#urls").append(code);
});