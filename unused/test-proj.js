var Proj4js = require('proj4js');
var dd = new Proj4js.Proj('EPSG:4236');
var merc = new Proj4js.Proj('EPSG:3875');
var lcc = new Proj4js.Proj('EPSG:27563');


function test() {
	var p = new Proj4js.Point(-86.81,26.11);  
	console.log(p);
	console.log(Proj4js.transform(dd, merc, p));
	console.log(Proj4js.transform(dd, lcc, p));
};


setTimeout(test,3000);





function project(point, wkid, callback){
//var project = function(point, wkid){
	var epsg;
	// wkid will be a string
	if (wkid == 102100 || wkid == 102113 || wkid == 3857) epsg = 3857;
	else if (wkid == 4326) return false;
	else epsg = 4139;
	
	//console.log('epsg: ' + epsg);
	
	try{
		//proj = new Proj4js.Proj("EPSG:4139");
		var proj = new Proj4js.Proj('EPSG:' + epsg, function(){
			var newPoint = Proj4js.transform(Proj4js.WGS84, proj, new Proj4js.Point(point));
			console.log(newPoint);
			callback(newPoint);
			//return [newPoint.x, newPoint.y];
		});		
	}
	catch(e){
		console.log(e);
		callback(false);
		//return false;
	}
} /* */

/*
project([-86.81,26.11], 102100, function(point){
	delete point.z;
	console.log(point);
});
*/