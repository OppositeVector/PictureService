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

var WriteMetadata = exports.WriteMetadata = function(data, callback) {

	var iTag = TAG + ": WriteMetadata: ";
	metaModel.findOneAndUpdate({ id: data.id }, data, { upsert:true }, function(err, result) {
		if(err) {
			if(callback != null) {
				callback(err);
			} else {
				console.log(iTag + err);
			}
			return;
		}
		if(callback != null) {
			callback(null, result);
		}
	});

}