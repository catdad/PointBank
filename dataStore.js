var config = require('./config.json');
var databaseUrl = config.dbHost + config.dbName; // "username:password@example.com/mydb"
var collections = ['tasks'];
var db = require('mongojs').connect(databaseUrl, collections);

module.exports = db;