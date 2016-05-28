var http = require('http');
var express = require('express');
var cors = require('cors');
var dbc = require('./dbcontroller/main');
var multer = require('multer');
var fs = require('fs');
var GUID = require('guid');
var bodyParser = require('body-parser');
var memjs = require('memjs');

var bs = require('nodestalker'),
    client = bs.Client('ec2-54-93-124-121.eu-central-1.compute.amazonaws.com:11300');

client.use('default');

var lfs = "localfilestore";
var storage = multer.memoryStorage()
var upload = multer({ storage: storage });
var s3Bucket = 'vicspicturestorage2';

var knoxClient = require('knox').createClient({
	key: process.env.S3_KEY,
	secret: process.env.S3_SECRET,
	bucket: s3Bucket,
	signatureVersion: 'v4',
    region: 'us-standard'
});

var memjsClient = memjs.Client.create();

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
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/pictures/:id/:type', function(req, res) {
	var picId = req.params.id;
	var picType = req.params.type;
	memjsClient.get(picId + picType, function(pic) {
		res.status(200);
		res.send(pic);
	})
});

app.get('/TestKnox', function(req, res) {

	var object = { foo: "bar" };
	var string = JSON.stringify(object);
	var knoxReq = knoxClient.put('/test/obj.json', {
	    'Content-Length': Buffer.byteLength(string),
	  	'Content-Type': 'application/json',
	  	'x-amz-acl': 'public-read',
	});
	knoxReq.on('response', function(knoxRes) {
		res.json(knoxRes.statusCode);
	});
	knoxReq.end(string);

});

app.get('/Files', function(req, res) {
	var params = { s3Params: {
    	Bucket: s3Bucket,
    	// other options supported by putObject, except Body and ContentLength.
    	// See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
  		}
  	}
	knoxClient.list({ prefix: '' }, function(err, data){
		SendJson(data, res);
	});
});

app.put("/file", upload.single("image"), function(req, res) {
	console.log(req.file);
	console.log(req.body);

	var fileData = {
		id: GUID.raw(),
		mimetype: req.file.mimetype,
		encoding: req.file.encoding,
		name: req.file.originalname,
		title: req.body.title,
		author: req.body.author,
		errs: [],
		created: false
	}

	var sp = fileData.name.split('.');
	fileData.extension = sp[sp.length - 1].toLowerCase();
	fileData.s3Path = '/images/' + fileData.id;

	// res.json({ result: 1, data: "yay !" });

	var tries = 0;
	function Recursive() {
		dbc.CreateMetadata(fileData, function(err, results) {
			if(err) {
				++tries;
				if(tries < 5) {
					Recursive();
					return;
				}
				res.json({ result: 0, err });
				console.log(err);
				return;
			}
			var kreq = knoxClient.put(fileData.s3Path + '/original', {
			    'Content-Length': req.file.size,
			    'Content-Type': fileData.mimetype,
			    'x-amz-acl': 'public-read'
			});
			kreq.on('response', function(kres) {
				console.log(kres.statusCode);
				if (200 == kres.statusCode) {
					console.log('saved to %s', kreq.url);
					client.put(JSON.stringify({ 
						jobType: 'createVersions', 
						fileid: fileData.id
					}));
					res.json({ result: 1, data: fileData });
				} else {
					var errs = [ "Could not write file to storage, status code:" + kres.statusCode ]
					dbc.RemoveMetadata(fileData.id, function(err) {
						if(err) {
							errs.push(err);
						}
						res.json({ result: 0, data: errs });
					});
				}
			});
			kreq.end(req.file.buffer);
		});
	}
	Recursive();
});

app.get("/testfile", function(req, res) {

	var params = { s3Params: {
    	Bucket: s3Bucket,
    	// other options supported by putObject, except Body and ContentLength.
    	// See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
  		}
  	}
	knoxClient.list({ prefix: '' }, function(err, data){
		var key = data.Contents[0].Key
		var split = key.split('/');
		var filename = split[split.length-1];
		var file = fs.createWriteStream(lfs + '/' + filename);
		var ekey = '/' + key;
		console.log(ekey);
		knoxClient.get(ekey).on('response', function(stream) {
			console.log(stream.statusCode);
			console.log(stream.headers);
            stream.on('data', function(chunk) { console.log(chunk); file.write(chunk); });
            stream.on('end', function(chunk) { file.end(); /*Resize(filePath, fileData, callback)*/ });
        }).end();
	});

	res.json({ result: 1, data: "trying ! " });

});

var port = process.env.PORT || 3000;

app.listen(port);
console.log(GetDateTime() + ': listening on port ' + port);