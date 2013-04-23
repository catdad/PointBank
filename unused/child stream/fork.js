var cp = require('child_process');

exports.start = function startChild(){
	var n = cp.fork('./process.js');

	n.on('message', function(m) {
		console.log('PARENT got message:', m);
	});

	n.send({ hello: 'world' });
}

