var fs = require('fs');
var knox = require('knox');

var TAG = "SimpleKnox";

function DoError(err, cb) {
	if(cb != null) {
		cb(err);
	} else {
		console.log(err);
	}
}

module.exports = function(bucket, region) {

	var knoxClient = knox.createClient({
		key: process.env.S3_KEY,
		secret: process.env.S3_SECRET,
		bucket: bucket,
		signatureVersion: 'v4',
	    region: region
	});

	this.PutImage = function(fileData, type, buffer, cb) {

		var iTAG = TAG + ": PutImage";

		var fullPath = fileData.s3Path + '/' + type;
		var req = knoxClient.put(fullPath, {
		    'Content-Length': fileData.size,
		    'Content-Type': fileData.mimetype,
		    /*'x-amz-acl': 'public-read'*/
		});
		req.on('response', function(res) {
			if (res.statusCode != 200) {
				var error = { tag: iTAG, err: 'Could not write file ' + fullPath + ' to storage, status code:' + kres.statusCode };
				DoError(error, cb);
			} else {
				var str = 'File written to ' + req.url;
				if(cb != null) {
					cb(null, str);
				} else {
					console.log(str);
				}
			}
		});
		req.end(buffer);

	}

	this.GetImage = function(fileData, type, cb) {

		var iTAG = TAG + ": GetImage";

		var file = new Buffer(fileData.size);
		var count = 0;
		knoxClient.get(fileData.s3Path + '/' + type).on('response', function(stream) {
			if(stream.statusCode != 200) {
				var error = { tag: iTAG, data: 'Retrieval of ' + fileData.id + ' return status code ' + stream.statusCode };
				DoError(error, cb);
			} else {
	            stream.on('data', function(chunk) { 
	            	chunk.copy(file, count);
	            	count += chunk.length;
	            });
	            stream.on('end', function(chunk) { 
	            	var fixed = new Buffer(count);
	            	file.copy(fixed);
	            	if(cb != null) {
	            		cb(null, fixed);
	            	} else {
	            		console.log(iTAG + ": No callback provided");
	            	}
	            });
	        }
	    }).end();

	}

	this.DeleteImage = function(fileData, types, cb) {

		var index = 0;
		function Recursive() {
			if(index < types.length) {
				knoxClient.del(fileData.s3Path + '/' + types[i]).on('response', function(res){
	                console.log('delete ' + fileData.s3Path + '/' + types[i] + ' -- ' + res.statusCode);
	                ++index;
	                Recursive();
            	}).end();
			} else {
				if(cb != null) {
					cb();
				}
			}
		}
		Recursive();

	}

}