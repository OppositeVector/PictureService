var http = require('http');
var express = require('express');
// var opsworks = require('opsworks');

var knoxClient = require('knox').createClient({
	key: process.env.S3_KEY,
	secret: process.env.S3_SECRET,
	bucket: 'vicspicturestorage'
});

function GetDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + "--" + hour + "-" + min + "-" + sec;

}

function SendJson(object, res) {

	res.header('Access-Control-Allow-Methods', 'GET, POST');
	res.header('Access-Control-Allow-Origin', 'http://localhost');
	res.header('Access-Control-Allow-Headers', 'Content-Type, *');
	app.set('json spaces',4);
	res.set('Content-Type','application/json');
	res.status(200);
	// console.log(JSON.stringify(object));
	res.json(object);

}

var app = express();

app.use('/', express.static('./public'));

app.get('/pictures/:id', function(req, res) {
	var picId = req.params.id;
});

app.get('/TestKnox', function(req, res) {

	var object = { foo: "bar" };
	var string = JSON.stringify(object);
	var knoxReq = knoxClient.put('/test/obj.json', {
	    'Content-Length': Buffer.byteLength(string)
	  , 'Content-Type': 'application/json'
	});
	knoxReq.on('response', function(knoxRes) {
		res.json(knoxRes.statusCode);
	});
	knoxReq.end(string);

});

app.get('/Files', function(req, res) {
	knoxClient.list({ prefix: 'my-prefix' }, function(err, data){
		SendJson(data, res);
	});
});

var port = process.env.PORT || 3000;

app.listen(port);
console.log(GetDateTime() + ': listening on port ' + port);