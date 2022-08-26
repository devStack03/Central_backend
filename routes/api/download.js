var express = require("express");
var mongoose = require('mongoose');
var utils = require('./../../helpers/utils');
var User = require('./../../models/user');
var Like = require('./../../models/like');
var Transaction = require('./../../models/transaction');
var Bookmark = require('./../../models/bookmark');
var Post = require('./../../models/post');
var Download = require('./../../models/download');
const download = require("./../../models/download");

var auth = require('./../../middlewares/auth')();
const router = express.Router();

router.get('/', auth.authenticate(), (req, res, next) => {
    console.log("download");
});

router.post('/', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];

    const postId = req.body.post;
    if (!postId) {
        return res.json(utils.getResponseResult({}, 0, 'Invalid post parameter'));
    }
    Download.findByUserAndPost(userId, postId).then((downloadData) => {
        Post.findByPost(postId).then(async (post) => {
            if ( downloadData ) {
                return res.json(utils.getResponseResult({file: post.assetFile, isCreated: 0}, 1, ''));
            }

            if (userId == post.owner._id) {
                return res.json(utils.getResponseResult({file: post.assetFile, isCreated: 0}, 1, ''));
            }

            if (post.coins >= 0) {
                // should check balance of user
                User.findUserById(userId).then(async (user) => {
                    if (post.coins == 0 || user.balance >= post.coins) {
                        Download.createNewDownload(userId, req.body, post).then((data) => {
                            if (post.coins > 0) {
                                // create transation --------
                                var transObj = {
                                    receiver: post.owner,
                                    amount: post.coins,
                                    post: post._id,
                                    type: 1
                                };
                                
                                Transaction.createNewTransaction(userId, transObj).then((data) => {
                                    return res.json(utils.getResponseResult({file: post.assetFile, isCreated: 1}, 1, ''));
                                }, (error) => {
                                    return res.status(500).json(utils.getResponseResult({}, 0, 'Database error, create transaction failed'));
                                });
                            }
                            else {
                                res.json(utils.getResponseResult({file: post.assetFile, isCreated: 1}, 1, ''));
                            }
                            
                        }, (error) => {
                            return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
                        });
    
                    } else {
                        res.json(utils.getResponseResult({}, 0, 'Low balance'));
                    }
                },
                (error) => {
                    return res.status(500).json(utils.getResponseResult({}, 0, 'Database error, user not found'));
                })
            }
        },
        (error) => {
            return res.status(500).json(utils.getResponseResult({}, 0, 'Database error, cannot find post'));
        });
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error, cannot find post-download history'));
    });
    

    
});


router.delete('/:id', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    Like.unlike(req, req.body).then((data) => {
        if (like) {
            res.json(utils.getResponseResult(like, 1, ''));
        } else {
            res.json(utils.getResponseResult({}, 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});


module.exports = router;