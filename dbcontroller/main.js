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

var CreateMetadata = exports.CreateMetadata = function(data, callback) {

	var iTag = TAG + ": CreateMetadata";
	metaModel.create(data, function(err, data) {
		if(err) {
			var error = { tag: iTag, data: err };
			if(callback != null) {
				callback(error);
			} else {
				console.log(error);
			}
			return;
		}
		if(callback != null) {
			callback(null, data);
		}
	});

}

var WriteMetadata = exports.WriteMetadata = function(data, callback) {

	var iTag = TAG + ": WriteMetadata";
	metaModel.findOneAndUpdate({ id: data.id }, data, { upsert:true }, function(err, result) {
		if(err) {
			var error = {
				tag: iTag,
				data: err
			}
			if(callback != null) {
				callback(error);
			} else {
				console.log(error);
			}
			return;
		}
		if(callback != null) {
			callback(null, result);
		}
	});

}

var RemoveMetadata = exports.RemoveMetadata = function(id, callback) {

	var iTag = TAG + ": RemoveMetadata";
	metaModel.remove({ id: id }, function(err) {
		if(err) {
			var error = { tag: iTag, data: err };
			if(callback != null) {
				callback(error);
			} else {
				console.log(err);
			}
		} else {
			callback();
		}
	});

}

var GetMetadata = exports.GetMetadata = function(id, callback) {

	var iTag = TAG + ": GetMetadata";
	metaModel.findOne({ id: id }, function(err, data) {
		if(err) {
			var errors = { tag: iTag, data: err };
			if(callback != null) {
				callback(errors);
			} else {
				errors.data += ", Also no callback provided for get call";
				console.log(errors);
			}
			return;
		}
		callback(null, data);
	});

}