var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var User = require('./../models/user');
var bcrypt = require('./../helpers/bcrypt');
var PassportError = require('./passportError');
var cache = require('./../helpers/cache');
var utils = require('./../helpers/utils');
var aws = require('./../helpers/aws');
var Configuration = require('../config.js');

/**
 * Set up passport serialization
 */

passport.serializeUser((user, done) => {
    cache.passport.set(user._id, user); //store user in cache
    done(null, user._id);
});

passport.deserializeUser((id, done) => {
    if (cache.passport.has(id)) {
        return done(null, cache.passport.get(id));
    }
    User.findById(id).exec().then((user) => {
        cache.passport.set(id, user);
        done(null, user);
    }
    ).catch((error) => {
        done(error);
    });
});

passport.use(new FacebookStrategy({
    clientID: "1023879140982814",
    clientSecret: "4c3a3fd2f334952b951593a06280196e",
    callbackURL: 'http://localhost:3000/login'
},
    function (accessToken, refreshToken, profile, cb) {
        console.log('access => ', accessToken);
        return cb(null, profile);
    }));
// signup
passport.use('local-register', new LocalStrategy({ passReqToCallback: true, 'usernameField': 'email' }, (req, username, password, done) => {
    // when only email register
    const email = req.body.email;
    const fullname = req.body.fullName;
    User.findUserByEmail(email).then((user) => {
        if (user) {
            return done(new PassportError(0, 'Email exists'), null, null);
        }
        //User.findUser(username).then((_user) => {
        //    if (_user) {
        //        return done(new PassportError(0, 'Username exists'), null, null);
        //    }

            let rand = Math.floor((Math.random() * 100) + 54);


            if (Configuration.email_verification) {
                aws.sendVerificationEmail(req, email, username, rand, function (err, data) {
                    if (data) {
                        console.log("data => error => ", data, err);
                        bcrypt.generateHash(password).then(hash => {
                            const newUser = new User();
                            newUser.username = username;
                            newUser.email = email;
                            newUser.password = hash;
                            newUser.type = 1; //email
                            newUser.isVerified = false;
                            newUser.name = fullname;
                            newUser.save().then((doc) => {
                                return done(null, utils.customizedUserInfo(doc), null);
                            });
                        });
                    } else {
                        console.log("data => error => ", data, err);
                        return done(err);
                    }
                });
            }
            else
            {
                bcrypt.generateHash(password).then(hash => {
                    const newUser = new User();
                    newUser.username = username;
                    newUser.email = email;
                    newUser.password = hash;
                    newUser.type = 1; //email
                    newUser.isVerified = true;
                    newUser.name = fullname;
                    newUser.save().then((doc) => {
                        return done(null, utils.customizedUserInfo(doc), null);
                    });
                });
            }
        //});
    });
}));

// login
passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, (req, email, password, done) => {
    let _user = undefined;
    if (!email) {
        return done(new PassportError(-1, 'Email is required'), null, null);
    }
    User.findUserByEmail(email).then(user => {
        console.log('user => ', user);
        if (!user) {
            return done(new PassportError(0, 'Email is not exist'), null, null);
        }
        if (user.isVerified) {
            _user = user;
            bcrypt.compareHash(user.password, password).then(result => {
                if (result) {
                    return done(null, utils.customizedUserInfo(user), null);
                } else {
                    return done(new PassportError(0, 'Password is wrong'), null, null);
                }
            }).catch(error => {
                return done(new PassportError(0, 'INVALID AUTH'), null, null);
            });
        } else {
            return done(new PassportError(0, 'You have been not verified yet.'), null, null);
        }
    });
}));

// social
passport.use('local-social', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'socialId',
    passReqToCallback: true
}, (req, username, socialId, done) => {
    const type = req.body.type;
    if (type == 2) { // facebook
        User.findUserByFacebookId(socialId).then((user) => {
            if (user) {
                return done(null, utils.customizedUserInfo(user), '1');
            } else {
                User.findUser(username).then(_user => {
                    if (_user) {
                        return done(new PassportError(0, "USERNAME EXISTS"));
                    } else {
                        const newUser = new User();
                        newUser.type = 2; // facebook
                        newUser.o_auth.facebook.id = socialId;
                        newUser.o_auth.facebook.access_token = req.body.access_token;
                        newUser.username = username;
                        newUser.isVerified = true;
                        if (req.body.email) newUser.email = req.body.email;
                        if (req.body.avatar) newUser.avatar = req.body.avatar;
                        if (req.body.firstName) newUser.firstName = req.body.firstName;
                        if (req.body.lastName) newUser.lastName = req.body.lastName;
                        if (req.body.age) newUser.age = req.body.age;
                        if (req.body.gender) newUser.gender = req.body.gender;
                        newUser.save().then((doc) => {
                            return done(null, utils.customizedUserInfo(doc), null);
                        });
                    }
                });
            }
        })
    } else if (type == 3) { // google
        User.findUserByGoogleId(socialId).then((user) => {
            if (user) {
                return done(null, utils.customizedUserInfo(user), '1');
            } else {
                User.findUser(username).then(_user => {
                    if (_user) {
                        return done(new PassportError(0, "USERNAME EXISTS"));
                    } else {
                        const newUser = new User();
                        newUser.type = 3; // google
                        newUser.o_auth.google.id = socialId;
                        newUser.username = username;
                        newUser.isVerified = true;
                        if (req.body.access_token)
                            newUser.o_auth.google.access_token = req.body.access_token;
                        if (req.body.email) newUser.email = req.body.email;
                        if (req.body.avatar) newUser.avatar = req.body.avatar;
                        newUser.save().then((doc) => {
                            return done(null, utils.customizedUserInfo(doc), null);
                        });
                    }
                });
            }
        })
    }
}
));