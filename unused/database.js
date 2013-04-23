var databaseUrl = 'test'; // "username:password@example.com/mydb"
var collections = ['foo'];
var db = require('mongojs').connect(databaseUrl, collections);

exports.find = function find(req, res){
	var name = req.params.name;
	var value = req.params.value;
	
	switch(name){
		case 'name':
			console.log('search by name');
			findByName(value, res);
			break;
		case 'a':
			console.log('search by a');
			findByA(value, res);
			break;
		case 'number':
			console.log('search by number');
			findByNumber(value, res);
			break;
		default:
			res.send('invalid parameter');
	}
}

exports.add = function add(req, res){
	var name = req.params.name;
	var number = Number(req.params.number);
	
	db.foo.save({a: 'b', name: name, number: number}, function(err, saved) {
		if( err || !saved ) console.log('not saved');
		else console.log('saved');
	});
	
	res.send('adding occured');
}

function processFindResult(err, foo, res){
	if (err || !foo.length) {
		console.log('**nothing found**');
		res.send('nothing found');
	}
	else {
		var data = 'data:<br/><br/>';
		for (i in foo){
			console.log(foo[i]);
			data += JSON.stringify(foo[i]);
			data += '<br/>';
		}
		res.send(data);
	}
}

function findByName(value, res){
	db.foo.find({name:value}, function(err, foo) {
		return processFindResult(err, foo, res);
	});
}

function findByA(value, res){
	db.foo.find({a:value}, function(err, foo) {
		return processFindResult(err, foo, res);
	});
}

function findByNumber(value, res){
	var n = Number(value);
	db.foo.find({number:n}, function(err, foo) {
		return processFindResult(err, foo, res);
	});
}