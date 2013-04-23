function parseData(data){
	
	for (i in data){
		var tweet = data[i];
		var sentClass = getClass(tweet.sentiment.score);
		var code = "<div class='tweet span9 " + sentClass + "' >";
		code += '<img src=' + tweet.profile_image_url + ' />';
		code += '<b> ' + tweet.from_user_name + '</b>  <i>@' + tweet.from_user + '</i>';
		code += '<br/><p>' + tweet.text + '</p>';
		code += 'latLon: ' + JSON.stringify(tweet.latLon) + '<br/>';
		code += 'created: ' + tweet.created_at + '<br/>';
		
		code += 'sentiment score: ' + tweet.sentiment.score + '<br/>';
		code += JSON.stringify(tweet.sentiment) + '<br/>';
		
		code += '</div>';
		
		$("#tweets").append(code);
	}
}

function getClass(score){
	if (score > 1) return 'positiveHigh';
	else if (score > 0) return 'positive';
	else if (score < 0) return 'negative';
	else if (score < -1) return 'negativeLow'
	else return 'neutral'
}