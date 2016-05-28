var http = require('http');
var express = require('express');
var cors = require('cors');
var dbc = require('./dbcontroller/main');
var multer = require('multer');
var fs = require('fs');
var GUID = require('guid');
var bodyParser = require('body-parser');
var memcached = require('memcached');
var memcachedBinary = require('memcached-binary');

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

var memcachedClient = new memcached('localhost:11211');
var binaryClient = new memcachedBinary('localhost:11211', { use_buffers: true });

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
	var id = req.params.id;
	var type = req.params.type;
	var data = {  };

	binaryClient.get(id + type, null, function(err, file) {
		if(err) {
			console.log(err);
		} else {
			if(file == null) {
				dbc.GetMetadata(id, function(err, fileData) {
					if(err) {
						res.json({ result: 0, data: err });
						return;
					}
					if(fileData != null) {
						var file = new Buffer(fileData.size);
						var count = 0;
						knoxClient.get(fileData.s3Path + '/' + type).on('response', function(stream) {
			                if(stream.statusCode == 200) {
			                    stream.on('data', function(chunk) { 
			                    	chunk.copy(file, count);
			                    	count += chunk.length;
			                    });
			                    stream.on('end', function(chunk) { 
			                    	var fixed = new Buffer(count);
			                    	file.copy(fixed);
									binaryClient.set(id + type, fixed, { lifetime: 300 }, function(err) {
			                    		if(err) {
			                    			res.json({ result: 0, data: 'Internal caching error, please try again later'});
			                    			return;
			                    		}
			                    		memcachedClient.set(id + type + 'data', { mimetype: fileData.mimetype, size: count }, 300, function(err) {
			                    			if(err) {
			                    				res.json({ result: 0, data: 'Internal caching error, please try again later'});
			                    				return;
			                    			}
			                    			res.setHeader('Content-Type', fileData.mimetype);
			                    			res.setHeader('Content-Length', count);
				                    		res.status(200);
				                    		res.write(fixed);
				                    		res.end();
				                    		// res.end(file, 'binary');
			                    		});
		                    		});
			                    });
			                } else {
			                    res.json({result: 0, data: 'Could not find file'});
			                }
			            }).end();
					} else {
						res.json({result: 0, data: 'Could not find file'});
					}
				});

			} else {
				// res.json(fileBlock);
				memcachedClient.get(id + type + 'data', function(err, data) {
					if(err) {
						res.json({ result: 0, data: 'Internat caching error, please try again later'});
						return;
					}
					console.log(file.constructor);
					console.log(data);
					res.status(200);
					res.setHeader('Content-Type', data.mimetype);
					res.setHeader('Content-Length', data.size);
					res.write(file);
					res.end();
					// res.end(file, 'binary');
					// res.json(file);
				});
				
			}
		}
	});

	// memcachedClient.set('test', 'asdfasdfasdfasdf', 600, function(err) {
	// 	if(err) {
	// 		console.log(err);
	// 	} else {
	// 		memcachedClient.get('test', function(err, val) {
	// 			if(err) {
	// 				console.log(err);
	// 			} else {
	// 				console.log(val);
	// 			}
	// 		});
	// 	}
	// });

	// memjsClient.set("myVal", "alskdjfalskdjflkasjdflkajsdf", function(err, val){
	// 	if(err) {
	// 		console.log(err);
	// 	}
	// 	console.log("Saved " + val);
	// }, 600);

	// memjsClient.get("myVal", function(pic) {
	// 	console.log(pic);
	// 	res.status(200);
	// 	res.send(pic);
	// })
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
		created: false,
		size: req.file.size
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
				res.json({ result: 0, data: err });
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