var mongoose = require("mongoose");
var metadata = require("./metadataSchema");

mongoose.connect(process.env.MLAB_URI);
var metaModel = mongoose.model("metaM", metadata.schema);

var con = exports.connection = mongoose.connection;

var TAG = "DBController";

con.once('open',function(err) {

	if(err) {
		console.log(err);
	} else {
		console.log('Successfully opened production db connection');
	}

});

function DoError(err, cb) {
	if(cb != null) {
		cb(err);
	} else {
		console.log(err);
	}
}

var CreateMetadata = exports.CreateMetadata = function(data, cb) {

	var iTAG = TAG + ": CreateMetadata";
	metaModel.create(data, function(err, data) {
		if(err) {
			var error = { tag: iTAG, data: err };
			DoError(error, cb);
			return;
		}
		if(cb != null) {
			cb(null, data);
		}
	});

}

var WriteMetadata = exports.WriteMetadata = function(data, cb) {

	var iTAG = TAG + ": WriteMetadata";

	metaModel.findOneAndUpdate({ id: data.id }, data, { upsert:true }, function(err, result) {
		if(err) {
			var error = { tag: iTAG, data: err };
			DoError(error, cb);
			return;
		}
		if(cb != null) {
			cb(null, result);
		}
	});

}

var RemoveMetadata = exports.RemoveMetadata = function(id, cb) {

	var iTAG = TAG + ": RemoveMetadata";

	metaModel.remove({ id: id }, function(err) {
		if(err) {
			var error = { tag: iTAG, data: err };
			DoError(error, cb);
		} else {
			if(cb != null) {
				cb();
			}
		}
	});

}

var GetMetadata = exports.GetMetadata = function(id, cb) {

	var iTAG = TAG + ": GetMetadata";

	if(cb == null) {
		console.log(iTAG + ": No callback provided");
		return;
	}

	metaModel.findOne({ id: id }, function(err, data) {
		if(err) {
			var error = { tag: iTAG, data: err };
			cb(error);
			return;
		}
		cb(null, data);
	});

}

var GetAllIds = exports.GetAllIds = function(cb) {

	var iTAG = TAG + ': GetAllIds';

	if(cb == null) {
		console.log(iTAG + ": No callback provided");
		return;
	}

	metaModel.find({ created: true }, 'id author title', function(err, data) {
		if(err) {
			var error = { tag: iTAG, data: err }
			cb(error);
			return;
		}
		cb(null, data);
	});

}

var UpdateMetadata = exports.UpdateMetadata = function(id, data, cb) {

	var iTAG = TAG + ": UpdateMetadata";

	metaModel.findOneAndUpdate({ id: id }, data, function(err, results) {
		if(err) {
			var error = { tag: iTAG, data: err };
			DoError(error, cb);
			return;
		}
		if(cb != null) {
			cb(null, results);
		}
	});

}