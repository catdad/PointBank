var count = 0;

process.on('message', function(m) {
  console.log('CHILD got message:', m);
  setInterval(function(){
	sendMessage();
  }, 2000);
});

function sendMessage(){
	count++;
	process.send({ foo: 'bar', count: count });
}