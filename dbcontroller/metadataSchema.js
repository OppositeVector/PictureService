var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var metadata = Schema({
	id: {type: String, unique: true },
	mimetype: String,
	encoding: String,
	name: String,
	title: String,
	author: String,
	errs: [ Schema.Types.Mixed ],
	extension: String,
	s3Path: String,
	created: Boolean,
	size: Number
}, { collection: "metadata" });

exports.schema = metadata;