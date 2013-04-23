exports.plain = function(res, obj){
	res.send(obj, {'Content-Type': 'text/plain' });
}

exports.json = function(res, obj){
	//res.writeHead(200, {'Content-Type': 'application/json' });
	res.send(obj, {'Content-Type': 'text/plain' });
	//res.send(obj, {'Content-Type': 'application/json' });
}

exports.html = function(res, obj){
	res.send(obj, {'Content-Type': 'text/html' });
}

exports.jpeg = function(res){
	res.writeHead(200, {'Content-Type': 'image/jpeg' });
}

exports.ico = function(res){
	res.writeHead(200, {'Content-Type': 'image/ico' });
}

exports.compressed = function(res, compression){
	res.writeHead(200, { 'content-encoding': compression });
}

exports.rest = function(res){
	res.writeHead(302, { 'Location': '/arcgis/rest/services/' });
	res.end('\n');
}

exports.auto = function(res, service){
	var contentType = service.header.contentType;
	res.writeHead(200, {'Content-Type': contentType });
}