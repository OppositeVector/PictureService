var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var metadata = Schema({
	id: Number,
	path: String,
	resoution: {
		width: Number,
		height: Number
	},
	creator: String,
	title: String
});

exports.schema = metadata;