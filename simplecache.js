var memcachedM = require('memcached');
var binaryM = require('memcached-binary');

var memcached = new memcachedM('localhost:11211');
var binary = new binaryM('localhost:11211', { use_buffers: true });

var TAG = 'SimpleCache';

function DoError(err, cb) {
	if(cb != null) {
		cb(err);
	} else {
		console.log(err);
	}
}

module.exports = function(knox, dbc) {

	this.GetImage = function(id, type, cb)  {

		var iTAG = TAG + ': GetImage';

		if(cb == null) {
			console.log(iTAG + ": No callback provided");
			return;
		}

		memcached.get(id + type + 'data', function(err, data) {
			if(err) {
				var error = { tag: iTAG, msg: 'Internal caching error, please try again later -- ', data: err };
				cb(error);
				return
			}
			if(data == null) {
				RetrieveFile(id, type, function(err, data) {
					if(err) {
						var error = { tag: iTAG, data: err };
						cb(error);
						return;
					}
					cb(null, data);
				});
			} else {
				binary.get(id + type, null, function(err, file) {
					if(err) {
						var error = { tag: iTAG, msg: 'Internal caching error, please try again later -- ', data: err };
						cb(error);
						return;
					}
					if(file == null) {
						RetrieveFile(id, type, function(err, data) {
							if(err) {
								var error = { tag: iTAG, data: err};
								cb(error);
								return;
							}
							cb(null, data);
						});
					} else {
						data.file = file;
						cb(data);
					}
				});
			}
		});

	}

	this.RemoveImages = function(id, types, cb) {

		var index = 0;
		function Recursive() {
			if(index < types.length) {
				memcached.del(id + types[i] + "data", function(err) {
					++index;
					Recursive();
				});
			} else {
				if(cb != null) {
					cb();
				}
			}
		}
		Recursive();

	}

	function RetrieveFile(id, type, cb) {

		var iTAG = TAG + ": RetrieveFile";

		dbc.GetMetadata(id, function(err, fileData) {
			if(err) {
				var error = { tag: iTAG, data: err };
				DoError(error, cb);
				return;
			}
			if(fileData == null) {
				var error = { tag: iTAG, data: "Could not find file " + id };
				DoError(error, cb);
				return;
			}
			knox.GetImage(fileData, type, function(err, file) {
				if(err) {
					var error = { tag: iTAG, data: err };
					DoError(error, cb);
					return;
				}
				binary.set(id + type, file, { lifetime: 300 }, function(err) {
            		if(err) {
            			var error = { tag: iTAG, data: 'Internal caching error, please try again later' };
            			DoError(error, cb);
            			return;
            		}
            		var data = { mimetype: fileData.mimetype, size: file.length };
            		memcached.set(id + type + 'data', data, 300, function(err) {
            			if(err) {
            				var error = { tag: iTAG, data: 'Internal caching error, please try again later' };
            				DoError(error, cb);
            				return;
            			}
            			if(cb != null) {
            				data.file = file;
            				cb(null, data);
            			} else {
            				console.log(iTAG + ": No callback provided");
            			}
            		});
        		});
			});
		});

	}

}