var http = require('http');
var express = require('express');
var cors = require('cors');
// var opsworks = require('opsworks');

// var knoxClient = require('knox').createClient({
// 	key: process.env.S3_KEY,
// 	secret: process.env.S3_SECRET,
// 	bucket: 'vicspicturestorage'
// });

var s3 = require('s3');
var dbc = require("./dbcontroller");
 
var client = s3.createClient({
  maxAsyncS3: 20,     // this is the default 
  s3RetryCount: 3,    // this is the default 
  s3RetryDelay: 1000, // this is the default 
  multipartUploadThreshold: 20971520, // this is the default (20 MB) 
  multipartUploadSize: 15728640, // this is the default (15 MB) 
  s3Options: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    signatureVersion: 'v4',
    region: 'eu-central-1'
    // any other options are passed to new AWS.S3() 
    // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property 
  },
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
	// res.send(object);
}

var app = express();

app.use(cors());
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
	var params = { s3Params: {
    	Bucket: "vicspicturestorage",
    	// other options supported by putObject, except Body and ContentLength.
    	// See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
  		}
  	}
	var listRequest = client.listObjects(params);
	var files = [];
	// knoxClient.list({ prefix: 'my-prefix' }, function(err, data){
	// 	SendJson(data, res);
	// });
	listRequest.on("data", function(data) {
		files.push(data);
	})
	listRequest.on("end", function() {
		res.json(files);
	})
});

var port = process.env.PORT || 3000;

app.listen(port);
console.log(GetDateTime() + ': listening on port ' + port);