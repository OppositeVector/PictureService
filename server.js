var http = require('http');
var express = require('express');
var opsworks = require("opsworks");
var app = express();

app.use('/', express.static('./public'));

var port = process.env.PORT || 3000;

app.listen(port);
console.log('listening on port ' + port);
