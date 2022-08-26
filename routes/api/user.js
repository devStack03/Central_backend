var express = require("express");

var fileUpload = require('express-fileupload');
// var upload = multer({dest:'uploads/avatar/'});
var mkdirp = require('mkdirp');
var appRoot = require('app-root-path');
var utils = require('../../helpers/utils');
var bcrypt = require('../../helpers/bcrypt');
var Follow = require('../../models/follow');
var Post = require('../../models/post');
var User = require('../../models/user');
var Download = require('../../models/download');
var Bookmark = require('../../models/bookmark');
var Transaction = require('../../models/transaction');
var Kudo = require('../../models/kudo');
var Follow = require('../../models/follow');
var Like = require('../../models/like');
const user = require("../../models/user");
const download = require("../../models/download");
var auth = require('../../middlewares/auth')();
const router = express.Router();
var aws = require('../../helpers/aws');
var security = require('../../helpers/security');

router.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
}));

/**
 * Get User Profile
 */
router.get('/profile/:id', async (req, res, next) => {
    const userId = req.params.id;
    if (userId) {
        try {
            let user = await User.findUserById(userId);
            if (user) {
                
                let userData = utils.customizedUserInfo(user);
                userData['like_count'] = await Like.countByOwner(userId);
                userData['download_count'] = await Download.countByOwner(userId);
                userData['follow_count'] = await Follow.getFollowerCount(userId);
                userData['kudo_count'] = await Kudo.getKudosCountByReceiver(userId);
                return res.json(utils.getResponseResult(userData, 1, 'success'));
            } else {
                return res.json(utils.getResponseResult({}, 0, 'User not found'));
            }
        } catch (error) {
            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
        }
    } else {
        return res.status(404).json(utils.getResponseResult({}, 0, "User id must be attached"));
    }
});

router.get('/username/:username', auth.authenticate(), async (req, res, next) => {
    const username = req.params.username;
    if (username) {
        try {
            let user = await User.findUser(username);
            if (user) {
                const posts = await Post.getPostsCount(user._id);
                const followers = await Follow.getFollowerCount(user._id);
                const followings = await Follow.getFollowingCount(user._id);
                let userData = utils.customizedUserInfo(user);
                userData['followers_count'] = followers;
                userData['followings_count'] = followings;
                userData['posts_count'] = posts;

                return res.json(utils.getResponseResult(userData, 1, 'success'));
            } else {
                return res.json(utils.getResponseResult({}, 0, 'User not found'));
            }
        } catch (error) {
            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
        }
    } else {
        return res.status(404).json(utils.getResponseResult({}, 0, "User id must be attached"));
    }
});

router.get('/followers', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];

    if (userId) {
        Follow.getFollowers(userId).then((followers) => {
            if (followers && followers.length > 0) {
                return res.json(utils.getResponseResult(followers, 1, 'success'));
            } else {
                return res.json(utils.getResponseResult({}, 0, 'User not found'));
            }
        }, (error) => {
            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
        });
    } else {
        return res.status(404).json(utils.getResponseResult({}, 0, "User id must be attached"));
    }
});

router.get('/followings', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    if (userId) {
        Follow.getFollowings(userId).then((followings) => {
            if (followings && followings.length > 0) {
                return res.json(utils.getResponseResult(followings, 1, 'success'));
            } else {
                return res.json(utils.getResponseResult({}, 0, 'User not found'));
            }
        }, (error) => {
            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
        });
    } else {
        return res.status(404).json(utils.getResponseResult({}, 0, "User id must be attached"));
    }
});

/**
 * get 
 */

// router.get('/popular/:loaded', auth.authenticate(),  (req, res, next) => {
//     const loaded = parseInt(req.params.loaded, 10);
//     const userId = req.headers['user-id'];
//     User.populateByFollowers(userId).then( async (users) => {
//         var result = [];
//         for (var i = loaded ; i < users.length && i < loaded+12  ; i++) {
//             const follow = await Follow.checkFollow(users[i]._id.toString(), userId);
//             var u = users[i];
//             if (follow && !follow.unfollowedAt){
//                 u.isFollowing = true;
//             }
//             else {
//                 u.isFollowing = false;
//             }
//             result.push(u);
//         }
//         res.json(utils.getResponseResult({user:result, total: users.length}, 1, ''));
//     });
// });


router.get('/getBalanceAndKudo', auth.authenticate(),  (req, res, next) => {
    const userId = req.headers['user-id'];
    User.findById(userId).then( async (fuser) => {
        if (!fuser) {
             return res.json(utils.getResponseResult({}, 0, 'User not found'));
        }
        return res.json(utils.getResponseResult({balance:fuser.balance, kudo: fuser.kudoCount}, 1, ''));
    });
});

router.get('/getLeaderboardOverall', async (req, res, next) => {
    const limit = 3;
    User.getTopKudos(limit).then( async (kudousers) => {
         User.getTopPosts(limit).then( async (uploadusers) => {
            Download.getTopDownloadUsers(limit).then( async (groups) => {
                var idArray = [];
                groups.forEach((element) => {
                    idArray.push(element._id);
                });
                
                User.populate(groups, {path: '_id', lean: true}, function(err, populated) {
                    var downloadusers = [];
                    populated.forEach(element => {
                        downloadusers.push(element._id.toObject());
                    });

                    Transaction.getTopTipUsers(limit).then( async (tgroups) => {
                        
                        User.populate(tgroups, {path: '_id', lean: true}, function(err, populated) {
                            var tipusers = [];
                            populated.forEach(element => {
                                tipusers.push(element._id.toObject());
                            });

                            Like.getTopLikeUsers(limit).then( async (lgroups) => {
        
                                User.populate(lgroups, {path: '_id', lean: true}, function(err, populated) {
                                //User.findByIdArray(idArray).then( async (likeusers) => {
                                    var likeusers = [];
                                    populated.forEach(element => {
                                        likeusers.push(element._id.toObject());
                                    });

                                    Follow.getTopFolloweeUsers(limit).then( async (fgroups) => {
        
                                        User.populate(fgroups, {path: '_id', lean: true}, function(err, populated) {
                                        //User.findByIdArray(idArray).then( async (likeusers) => {
                                            var followeeusers = [];
                                            populated.forEach(element => {
                                                followeeusers.push(element._id.toObject());
                                            });
                                            return res.json(utils.getResponseResult({ke:kudousers, sd: downloadusers, su: uploadusers, tg: tipusers, lr: likeusers, mf: followeeusers}, 1, ''));
        
                                        }, (error) => {
                                            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                                        });
                
                                    }, (error) => {
                                        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                                    });

                                }, (error) => {
                                    return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                                });
        
                            }, (error) => {
                                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                            });
                        }, (error) => {
                            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                        });

                    }, (error) => {
                        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                    });

                });
        
        
                //User.findByIdArray(idArray).then( async (downloadusers) => {
                    
                //}, (error) => {
                //    return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                //});
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
         }, (error) => {
            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
        });
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
    });

    
});

router.get('/getLeaderboardData/:section', async (req, res, next) => {
    const limit = 50;
    let section = req.params.section;
    switch (section) {
        case 'ke':
        {
            User.getTopKudos(limit).then( async (kudousers) => {
                return res.json(utils.getResponseResult(kudousers, 1, ''));
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
            break;
        }
        case 'sd':
        {
            Download.getTopDownloadUsers(limit).then( async (groups) => {
                User.populate(groups, {path: '_id', lean: true}, function(err, populated) {
                    var users = [];
                    populated.forEach(element => {
                        users.push(element._id.toObject());
                    });
                    return res.json(utils.getResponseResult(users, 1, ''));
                }, (error) => {
                    return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                });
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
            break;
        }
        case 'su':
        {
            User.getTopPosts(limit).then( async (uploadusers) => {
                return res.json(utils.getResponseResult(uploadusers, 1, ''));
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
            break;
        }
        case 'tg':
        {
            Transaction.getTopTipUsers(limit).then( async (groups) => {
                User.populate(groups, {path: '_id', lean: true}, function(err, populated) {
                    var users = [];
                    populated.forEach(element => {
                        users.push(element._id.toObject());
                    });
                    return res.json(utils.getResponseResult(users, 1, ''));
                }, (error) => {
                    return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                });
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
            break;
        }
        case 'lr':
        {
            Like.getTopLikeUsers(limit).then( async (groups) => {
                User.populate(groups, {path: '_id', lean: true}, function(err, populated) {
                    var users = [];
                    populated.forEach(element => {
                        users.push(element._id.toObject());
                    });
                    return res.json(utils.getResponseResult(users, 1, ''));
                }, (error) => {
                    return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                });
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
            break;
        }
        case 'mf':
        {
            Follow.getTopFolloweeUsers(limit).then( async (groups) => {
                User.populate(groups, {path: '_id', lean: true}, function(err, populated) {
                    var users = [];
                    populated.forEach(element => {
                        users.push(element._id.toObject());
                    });
                    return res.json(utils.getResponseResult(users, 1, ''));
                }, (error) => {
                    return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                });
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
            break;
        }
    }
});

router.patch('/:id', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    if (userId) {
        User.updateUserById(userId, req.body).then((user) => {
            if (user) {
                return res.json(utils.getResponseResult(utils.customizedUserInfo(user), 1, 'success'));
            } else {
                return res.json(utils.getResponseResult({}, 0, 'User not found'));
            }
        }, (error) => {
            return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
        });
    } else {
        return res.status(404).json(utils.getResponseResult({}, 0, "User id must be attached"));
    }

});

/**
 * Remove current Photo
 */
router.delete('/:id/remove-avatar', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    if (userId) {
        User.removeCurrentAvatar(userId).then((_user) => {
            if (_user)
                res.json(utils.getResponseResult({}, 1, "Success"));
        }, (error) => {
            return res.status(400).json(utils.getResponseResult({}, 0, "Database failure."));
        });
    }
});
/**
 * Update avatar
 */
router.patch('/:id/update-avatar', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const picUrl = req.body.pic_url;
    if (userId) {
        User.updateCurrentAvatar(userId, picUrl).then((_user) => {
            if (_user)
                res.json(utils.getResponseResult({}, 1, "Success"));
        }, (error) => {
            return res.status(400).json(utils.getResponseResult({}, 0, "Database failure."));
        });
    }
});

/**
 * Change Password
 */

router.post('/change-password', auth.authenticate(), (req, res, next) => {

    const userId = req.body.id;
    const old_password = req.body.oldPassword;
    const new_password = req.body.newPassword;

    User.findById(userId, (err, user) => {

        if (err) return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));

        if (!user) return res.status(404).json(utils.getResponseResult({}, 0, "User not found"));


        bcrypt.compareHash(user.password, old_password).then(result => {
            if (result) {
                //generate password compareHash
                bcrypt.generateHash(new_password).then(hash => {
                    //Create a new account 
                    console.log("hash is **", hash);
                    user.password = hash;
                    user.save().then(doc => {
                        console.log("account is ***", doc);
                        res.json(utils.getResponseResult({}, 1, "Success"));
                    });
                });
            } else {
                return res.status(403).json(utils.getResponseResult({}, 0, "You entered the wrong password."));
            }
        }).catch(error => {
            return res.status(500).json(utils.getResponseResult({}, 0, "Unknown issue"));
        });
    })
});

/**
 * Change email address
 */

router.post('/changeEmail', auth.authenticate(), (req, res, next) => {
    const user_id = req.body.userId;
    const new_email = req.body.new_email;
    Account.findById(user_id, (err, account) => {
        if (err) return res.status(500).json(ResponseResult.getResponseResult({}, 0, "database failure"));

        if (!account) return res.status(404).json(ResponseResult.getResponseResult({}, 0, "User not found"));

        var code = random(5, "123456789");

        aws.sendVerificationEmail(new_email, account.username, code, function (err, data) {
            if (data) {
                console.log("data => error => ", data, err);
                account.common_profile.email = new_email;
                // account.is_verified = 0;
                account.verify = code;

                account.save().then(doc => {
                    console.log("account is ***", doc);
                    res.json(ResponseResult.getResponseResult({
                        _id: doc._id.toString(),
                        type: doc.type,
                        verified: doc.is_verified,
                        common_profile: doc.common_profile,
                        user_setting: doc.user_setting,
                        username: doc.username,
                        o_auth: doc.o_auth
                    }, 1, "Success."));
                });
            } else {
                return res.status(404).json(ResponseResult.getResponseResult({}, 0, "Can not send a code."));
            }
        });
    });
})

/**
 * Change private option
 */

router.post('/changeMessageOption', auth.authenticate(), (req, res, next) => {
    const user_id = req.body.userId;
    const setting = req.body.chat_setting;
    Account.findById(user_id, (err, account) => {

        if (err) return res.status(500).json(ResponseResult.getResponseResult({}, 0, "database failure"));

        if (!account) return res.status(404).json(ResponseResult.getResponseResult({}, 0, "User not found"));

        account.user_setting.message_send_mode = setting;
        account.save().then(doc => {
            console.log("account is ***", doc);
            res.json(ResponseResult.getResponseResult({
                _id: doc._id.toString(),
                type: doc.type,
                verified: doc.is_verified,
                common_profile: doc.common_profile,
                user_setting: doc.user_setting,
                username: doc.username,
                o_auth: doc.o_auth
            }, 1, "success"));
        })

    });
});

router.post('/follow', auth.authenticate(), (req, res, next) => {
    const userId  = req.headers['user-id'];
    const following = req.body.following;

    Follow.checkFollow(following, userId).then((follow) => {
        if (follow != null) {
            return res.json(utils.getResponseResult({isCreated: false}, 1, "Success."));
        }

        User.findById(following, (err, user) => {
            if (err) return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            if (!user) return res.status(404).json(utils.getResponseResult({}, 0, "User not found"));
    
            Follow.follow(following, userId).then((doc) => {
                return res.json(utils.getResponseResult({isCreated: true}, 1, "Success."));
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
        });

    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
    });
});

router.post('/unfollow', auth.authenticate(), (req, res, next) => {
    const userId  = req.headers['user-id'];
    const following = req.body.following;

    Follow.checkFollow(following, userId).then((follow) => {
        if (follow == null) {
            return res.json(utils.getResponseResult({isRemoved: false}, 1, "Success."));
        }

        User.findById(following, (err, user) => {
            if (err) return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            if (!user) return res.status(404).json(utils.getResponseResult({}, 0, "User not found"));
    
            Follow.unfollow(following, userId).then((doc) => {
                return res.json(utils.getResponseResult({isRemoved: true}, 1, "Success."));
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
            });
        });

    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
    });
});

router.get('/isFollowed/:following', auth.authenticate(), (req, res, next) => {
    const userId  = req.headers['user-id'];
    const following = req.params.following;

    Follow.checkFollow(following, userId).then((follow) => {
        if (follow != null) {
            return res.json(utils.getResponseResult({isFollowed: true}, 1, "Success."));
        }
        else {
            return res.json(utils.getResponseResult({isFollowed: false}, 1, "Success."));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
    });
});

router.post('/updateEmail', auth.authenticate(), (req, res, next) => {
    const userId  = req.headers['user-id'];
    const newEmail = req.body.newEmail;

    User.findUserById(userId).then((user) => {
        if (user == null) {
            return  res.status(404).json(utils.getResponseResult({}, 0, "User not found"));
        }

        User.findUserByEmail(newEmail).then((alreadyUser) => {
            if (alreadyUser != null) {
                return res.json(utils.getResponseResult({}, 0, "Email exists already"));
            }

            // should send verification email
            var code = security.random(5, "123456789");
            aws.sendUpdateEmailVerificationEmail(req, user.firstName + ' ' + user.lastName, user.email, newEmail, code, function (err, data) {
                if (data) {
                    User.updateUserById(userId, {email: newEmail, isVerified: false}).then((updated) => {
                        return res.json(utils.getResponseResult({}, 1, "Success"));
                    }, (error) => {
                        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                    });
                } else {

                    User.updateUserById(userId, {email: newEmail, isVerified: false}).then((updated) => {
                        return res.json(utils.getResponseResult({}, 1, "Success"));
                    }, (error) => {
                        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
                    });

                    //return res.status(404).json(utils.getResponseResult({}, 0, "Can not send a code."));
                }
            });
        });
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
    });
});


router.post('/updateSettings', auth.authenticate(), (req, res, next) => {
    const userId  = req.headers['user-id'];
    const country = req.body.country;
    const notification = req.body.notification;

    User.findUserById(userId).then((user) => {
        if (user == null) {
            return  res.status(404).json(utils.getResponseResult({}, 0, "User not found"));
        }

        User.updateSettings(userId, country, notification).then((data) => {
            if (data) {
                return res.json(utils.getResponseResult({country: data.country, notification:data.notification}, 1, "Success"));
            } else {
                return res.status(404).json(ResponseResult.getResponseResult({}, 0, "Can not send a code."));
            }
        });
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, "database failure"));
    });
});

module.exports = router;