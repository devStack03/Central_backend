var passport  = require("passport");
var passportJWT = require('passport-jwt');
var User = require("../models/user");
var verifyToken = require('../helpers/security').verifyToken;
var config = require('../config');
var ExtractJwt = passportJWT.ExtractJwt;
var Strategy = passportJWT.Strategy;

var opts = {
    secretOrKey: config.secret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
}

module.exports = function () {
    var strategy = new Strategy(opts, function(payload, done) {

        User.findById(payload.id, function(err, user) {
            if (user) {
                return done(null, {id: user.id, payload: user});
            }else {
                return done(new Error("User not found"), null);
            }
        });
    });
    passport.use(strategy);
    return {
        initialize: function() {
            return passport.initialize();
        },
        authenticate: function () {
            return passport.authenticate("jwt", {session: false});
        }
    };
};