var cluster = require('cluster');
var http = require('http');
var numReqs = 0;

exports.create = function createCluster(req, res){
	if (cluster.isMaster) {
	  // Fork workers.
	  for (var i = 0; i < 2; i++) {
		var worker = cluster.fork();

		worker.on('message', function(msg) {
		  if (msg.cmd && msg.cmd == 'notifyRequest') {
			numReqs++;
		  }
		});
	  }

	  setInterval(function() {
		console.log("numReqs =", numReqs);
	  }, 1000);
	} else {
	  // Worker processes have a http server.
	  http.Server(function(req, res) {
		res.writeHead(200);
		res.end("hello world\n");
		// Send message to master process
		process.send({ cmd: 'notifyRequest' });
	  }).listen(8080);
	}
}