const express = require("express");
const router = express.Router();
const passport = require('passport');
const PassportError = require('./../../passport/passportError');
const Utils = require('./../../helpers/utils');

const Account = require('./../../models/user.js');
const Security = require('../../helpers/security');
const User = require('../../models/user');

router.get('/', (req, res) => {
    res.json({ sessionID: req.sessionID, session: req.session });
});

router.post('/logout', (req, res) => {
    req.logout();

    req.session.destry();

    res.json({ success: true });
});

router.post('/register', (req, res, next) => {
    console.log('signup =>', req.body);
    passport.authenticate('local-register', {'usernameField': 'email'}, (err, user, info) => {
        //it's either an error or a success
        var result = {};
        if (err) {
            console.log(err);
            if (err instanceof PassportError) {

                result["success"] = err.code;
                result["error"] = err.message;
                // 
                return res.json(result);
            }
            return next(err);
        }
        else {
            if (user) {
                Security.getToken(user.id, user.email, function (token) {
                    user["token"] = token;
                    result["user"] = user;
                    result["success"] = 1;
                    result["error"] = "success";
                    return res.json(result);
                });
            }
            else {
                result["success"] = 0;
                result["error"] = "user is null";
                return res.json(result);
            }
        }

    })(req, res, next);
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local-login', (err, user, info) => {
        var result = {};
        if (err) {
            if (err instanceof PassportError) {
                result["success"] = err.code;
                result["error"] = err.message;
                // return res
                //     .status(422)
                //     .json(result);
                return res.json(result);
            }
            return next(err);
        } else {
            if (user) {
                Security.getToken(user.id, user.email, function (token) {
                    user["token"] = token;
                    result["user"] = user;
                    result["success"] = 1;
                    result["error"] = "success";
                    return res.json(result);
                });
            }
            else {
                result["success"] = 0;
                result["error"] = "user is null";
                return res.json(result);
            }
        }
    })(req, res, next);
});

router.post('/login-social', (req, res, next) => {
    passport.authenticate('local-social', (err, user, info) => {
        if (err) {
            return res.status(500).json(Utils.getResponseResult({}, 0, err.message));
        } else {
            var result = {};
            if (info) {
                if (user) {
                    Security.getToken(user.id, user.email, function (token) {
                        user["token"] = token;
                        result["user"] = user;
                        result["success"] = 3;
                        result["error"] = "account exists";
                        return res.json(result);
                    });
                }
            } else {
                if (user) {
                    Security.getToken(user.id, user.email, function (token) {
                        user["token"] = token;
                        result["user"] = user;
                        result["success"] = 1;
                        result["error"] = "success";
                        return res.json(result);
                    });
                }
                else {
                    result["success"] = 0;
                    result["error"] = "user is null";
                    return res.json(result);
                }
            }
        }
    })(req, res, next);
});

router.get('/verify', (req, res, next) => {
    // let host = '18.236.105.144';
    // if ((req.protocol + '://' + req.get('host')) === ('http://' + host)) {

    // }

    let decodedMail = new Buffer(req.query.mail, 'base64').toString('ascii');
    User.findUserByEmail(decodedMail).then(user => {
        console.log('user => ', user);
        if (!user) {
            return done(new PassportError(0, 'INVALID USER'), null, null);
        }
        if (!user.isVerified) {
            user.isVerified = true;
            user.save().then((data) => {
                res.render('index', { title: 'You have been verified.' });
            });
        } else {
            res.render('index', { title: 'You have been verified.' });
        }
    });
});

router.get('/verifyUpdated', (req, res, next) => {
    let decodedNewEail = new Buffer(req.query.newEmail, 'base64').toString('ascii');
    let decodedOrgEail = new Buffer(req.query.orgEmail, 'base64').toString('ascii');


    User.findUserByEmail(decodedNewEail).then(user => {
        console.log('user => ', user);
        if (!user) {
            return done(new PassportError(0, 'INVALID USER'), null, null);
        }
        if (!user.isVerified) {
            User.updateUserById(user._id, {isVerified: true}).then((data) => {
                res.render('index', { title: 'You have been verified.', name: user.firstName + ' ' + user.lastName + ', your email address is ' + decodedNewEail });
            }, (error) => {
                res.render('index', { title: 'Verification failed!', name: user.firstName + ' ' + user.lastName + ', verification failed for your new email ' + decodedNewEail });
            });
        } else {
            res.render('index', { title: 'You have been verified.', name: user.firstName + ' ' + user.lastName + ', your email address is ' + decodedNewEail });
        }
    });
});

module.exports = router;