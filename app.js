var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
const toJson = require('@meanie/mongoose-to-json');
var passport = require('passport');
require('./passport');// setup passport
// set global objects
global.__appbase_dirname = __dirname;
var session = require('express-session');
var flash = require('express-flash');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });


function Pixtagram(config) {

    this.init = () => {

        console.log("App is running...", __dirname);
        // view engine setup
        app.locals.appdata = config.appData;
        app.set('views', path.join(__dirname, 'views'));
        app.set('view engine', 'ejs');
        app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, user-id");
            next();
        });
        // uncomment after placing your favicon in /public
        // app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

        app.use(logger('dev'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(cookieParser());
        app.use(session({
            resave: false, // don't save session if unmodified
            saveUninitialized: false, // don't create session until something stored
            secret: 'session',
            cookie: {
                maxAge: 14 * 24 * 60 * 60 * 1000
            }
        }));
        app.use(flash());
        app.use(express.static(path.join(__dirname, 'dist')));
        app.use(express.static(path.join(__dirname, 'public')));
        // app.use(auth.initialize());

        app.use('/', indexRouter);
        app.use('/users', usersRouter);
        // oauth2Router.initialize(app);      
    };

    this.connectMongoDB = () => {
        mongoose.Promise = require('bluebird');
        mongoose.plugin(toJson);
        var db = mongoose.connection;
        db.on('error', console.error.bind(console, '[ERROR] Database loading error\n[ERROR]'));
        db.once('open', function () {
            console.log("[INFO] connection to the database established");
        });

        mongoose.connect(config.db.type + '://' + config.db.servers[0] + '/' + config.db.name, { useNewUrlParser: true }, function (err, db) {
            if (!err) {
                console.log("We are connected");
            } else {
                console.log(err);
            }
        });
    }

    this.initializePassport = () => {
        app.use(passport.initialize());
        app.use(passport.session());

        // passport.serializeUser(function(user, done) {
        //     done(null, user.id);
        // });

        // passport.deserializeUser(function(id, done) {
        //     User.findById(id, function(err, user) {
        //         done(err, user);
        //     });
        // });
    };


    this.initErrorHandler = () => {
        // catch 404 and forward to error handler

        app.use(function (req, res, next) {
            var err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        // error handler
        app.use(function (err, req, res, next) {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error');
        });
    };

    this.start = () => {

        var self = this;

        self.init();
        self.connectMongoDB();
        self.initializePassport();
        self.initErrorHandler();
    };

};

Pixtagram.startInstance = () => {

    var Configuration = require('./config.js');
    var config = Configuration.load();
    var pixtagram = new Pixtagram(config);
    pixtagram.start();

    return pixtagram;
}

Pixtagram.startInstance();


module.exports = app;
