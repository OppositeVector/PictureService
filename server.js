var http = require('http');
var express = require('express');
var opsworks = require('opsworks');
var AWS = require("aws-sdk");

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

var app = express();

app.use('/', express.static('./public'));

app.get('/pictures/:id', function(req, res) {
	var picId = req.params.id;
});

app.get('/TestKnox' function(req, res) {

	var object = { foo: "bar" };
	var string = JSON.stringify(object);
	var req = knoxClient.put('/test/obj.json', {
	    'Content-Length': Buffer.byteLength(string)
	  , 'Content-Type': 'application/json'
	});
	req.on('response', function(res){
	  if (200 == res.statusCode) {
	    console.log('saved to %s', req.url);
	  }
	});
	req.end(string);

});

var port = process.env.PORT || 3000;

app.listen(port);
console.log(GetDateTime() + ': listening on port ' + port);