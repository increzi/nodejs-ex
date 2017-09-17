//  OpenShift sample Node application
var express = require('express'),
    app     = express();

var server = require('http').Server(app);
var io = require('socket.io')(server);

var RESULTS_TO_SHOW = 10;

Object.assign=require('object-assign')

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';
    /*db.createCollection("calcs", function(err, res) {
        if (err) throw err;
            console.log("Collection created!");
    });*/

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    // Create a document with request IP and current time of request
    db.collection('counts').insert({ip: req.ip, date: Date.now()});
    res.sendFile(__dirname + '/views/index.html');

    var col = db.collection('calcs');
    col.find().sort({time: -1}).toArray(function(err, cursor){
        if (err) throw err;
        for (i = 0; i < RESULTS_TO_SHOW; i++) {
            io.emit('init', {text:cursor[i].msg, result:cursor[i].result id:cursor[i].time})
        }
    });
  } else {
    res.sendFile(__dirname + '/views/index.html');
    //res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', {text:"hehe", id:1});
    console.log("emitted");
    if (!db) {
        initDb(function(err){});
    }
    if (db) {
        console.log("sorting");
        var col = db.collection('calcs');
        col.insert({text: msg, result: null, time: Date.now()});
        col.find().sort({time: -1}).toArray(function(err, cursor){
            if (err) throw err;
            console.log(cursor);
        });
    }
  });
});

server.listen(port);
console.log('Server running on http://%s:%s', ip, port);
