var http = require('http');
var express = require('express');
var cors = require('cors');
var dbc = require('./dbcontroller/main');
var multer = require('multer');
var fs = require('fs');
var GUID = require('guid');
var bodyParser = require('body-parser');
// var memcached = require('memcached');
// var memcachedBinary = require('memcached-binary');
var knoxModule = require('./simpleknox');
var cacheModule = require('./simplecache');

var bs = require('nodestalker');
var nodestalker = bs.Client(process.env.WORKER_ADDRESS + ":11300");

nodestalker.use('default');

// var lfs = "localfilestore";
var storage = multer.memoryStorage()
var upload = multer({ storage: storage });
// var s3Bucket = 'vicspicturestorage2';

// var knoxClient = require('knox').createClient({
// 	key: process.env.S3_KEY,
// 	secret: process.env.S3_SECRET,
// 	bucket: s3Bucket,
// 	signatureVersion: 'v4',
//     region: 'us-standard'
// });

var knox = new knoxModule('vicspicturestorage2', 'us-standard');
var cache = new cacheModule(knox, dbc);

// var memcachedClient = new memcached('localhost:11211');
// var binaryClient = new memcachedBinary('localhost:11211', { use_buffers: true });

var imageTypes = [
	'original',
	'web',
	'thumbnail'
]

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

app.use(cors());
app.use('/', express.static('./public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/pictures/:id/:type', function(req, res) {

	var id = req.params.id;
	var type = req.params.type;

	cache.GetImage(id, type, function(err, data) {
		if(err) {
			res.json({ result: 0, data: err });
		} else {
			res.setHeader('Content-Type', data.mimetype);
			res.setHeader('Content-Length', data.size);
    		res.status(200);
    		res.write(data.file);
    		res.end();
		}
	});

});

app.get("/pictures", function(req, res) {
	dbc.GetAllIds(function(err, images) {
		if(err) {
			res.json({ result: 0, data: err });
		} else {
			res.json({ result: 1, data: images });
		}
	});
});

app.post("/pictures", upload.single("image"), function(req, res) {

	// console.log(req.file);
	// console.log(req.body);

	var fileData = {
		mimetype: req.file.mimetype,
		encoding: req.file.encoding,
		name: req.file.originalname,
		title: req.body.title,
		author: req.body.author,
		errs: [],
		created: false,
		size: req.file.size
	}

	var sp = fileData.name.split('.');
	fileData.extension = sp[sp.length - 1].toLowerCase();
	
	var tries = 0;
	function Recursive() {
		fileData.id = GUID.raw();
		fileData.s3Path = '/images/' + fileData.id;
		dbc.CreateMetadata(fileData, function(err, results) {
			if(err) {
				// Try several times as there might be a guid conflict
				++tries;
				if(tries < 5) {
					Recursive();
					return;
				}
				res.json({ result: 0, data: err });
				console.log(err);
				return;
			}
			knox.PutImage(fileData, imageTypes[0], req.file.buffer, function(err, msg) {
				if(err) {
					var errs = [ err ];
					dbc.RemoveMetadata(fileData.id, function(err) {
						if(err) {
							errs.push(err);
						}
						res.json({ result: 0, data: errs });
						console.log(errs);
					});
					return;
				}
				nodestalker.put(JSON.stringify({ 
					jobType: 'createVersions', 
					fileid: fileData.id
				}));
				res.json({ result: 1, data: fileData });
			});
		});
	}
	Recursive();

});

app.delete('/pictures/:id', function(req, res) {

	var id = req.params.id;

	console.log("Deleting " + id);

	dbc.UpdateMetadata(id, { created: false }, function(err, results) {
		if(err) {
			res.json({ result: 0, data: err });
			return;
		}
		res.json({result: 1, data: { id: id, messege: "Deleted" } });
		nodestalker.put(JSON.stringify({ 
			jobType: 'deleteFiles', 
			fileid: id
		}));
	});

});

app.put('/pictures/:id', upload.single('image'), function(req, res) {

	console.log(req.file);

	var id = req.params.id;

	dbc.GetMetadata(id, function(err, fileData) {

		if(err) {
			res.json({ result: 0, data: "Faile to replace file, could not file id" + id + " in database"});
			return;
		}

		fileData.mimetype = req.file.mimetype;
		fileData.encoding = req.file.encoding;
		fileData.nam = req.file.originalname;
		fileData.created = false;
		fileData.size = req.file.size;
		var sp = fileData.name.split('.');
		fileData.extension = sp[sp.length - 1].toLowerCase();

		knox.PutImage(fileData, imageTypes[0], req.file.buffer, function(err, msg) {
			if(err) {
				res.json({ result: 0, msg: "Failed to update file", data: err });
				return;
			}
			dbc.UpdateMetadata(id, fileData, function(err, results) {
				if(err) {
					res.json({ results: 0, data: err});
					return;
				}
				res.json({ result: 1, data: 'Updating ' + id });
				nodestalker.put(JSON.stringify({
					jobType: 'createVersions',
					fileid: id
				}));
			});
		});
	});

});

app.get('/cache/flush/:id', function(req, res) {

	cache.RemoveImages(req.params.id, imageTypes, function() {
		res.json({ result: 1, data: 'Flushed ' + req.params.id });
	});

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

var port = process.env.PORT || 3000;

app.listen(port);
console.log(GetDateTime() + ': listening on port ' + port);