(function(){
	function getLocation(){
		var extent = document.getElementById('picker').contentWindow.getExtent();
		return extent;
	}
	
	$("input[name=location]").each(function(idx, el){
		var toggle = function togglePicker(ev){
			console.log(ev.target.value);
			
			if (ev.target.value === 'picker') $("#picker").show();
			else $("#picker").hide();
		}
		
		el.onchange = toggle;
	});
	
	console.log('js is loading');
	if ($) console.log('jQuery is present');
	
	$('#submit').click(function(){
		var location = null;
		if ($("input[name=location]:checked").val() === 'picker')
			location = getLocation();
		
		var task = {
			type: $('input[name=type]:checked').val(),
			interval: $('input[name=interval]').val(),
			query: $('input[name=query]').val(),
			desiredTweets: $('input[name=desiredTweets]').val(),
			location: location,
			toGeocode: ($('input[name=toGeocode]:checked').length > 0),
			toGetCoords: ($('input[name=toGetCoords]:checked').length > 0),
			toSaveAll: ($('input[name=toSaveAll]:checked').length > 0)
		};
		
		$.ajax({
			url: '/collect',
			type: 'POST',
			data: task,
			success: function(data){
				console.log(data);
				setTimeout(function(){
					window.location.href = '/data';
				}, 1000);
			}
		}) /* */
	});
})(this);