var http = require('http');
var express = require('express');
var opsworks = require('opsworks');
var AWS = require("aws-sdk");

var knoxClient = require('knox').createClient({
	key: process.env.S3_KEY,
	secret: process.env.S3_SECRET,
	bucket: 'vicspicturestorage'
});

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

var app = express();

app.use('/', express.static('./public'));

app.get('/pictures/:id' function(req, res) {
	var picId = req.params.id;

});

var port = process.env.PORT || 3000;

app.listen(port);
console.log('listening on port ' + port);