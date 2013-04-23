var cp = require('child_process');
var stream = cp.fork('./streamTask');

exports.create = function createChild(){
	console.log('create child');
	
	/*
	stream.on('message', function(m){
		console.log('parent: ' + m);
	}
	*/
	stream.send('start');
}

exports.stop = function stopChild(){
	console.log('stopping child');
	stream.kill('SIGHUP');
}