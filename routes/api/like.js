var express = require("express");
var mongoose = require('mongoose');
var utils = require('./../../helpers/utils');
var User = require('./../../models/user');
var Like = require('./../../models/like');
var Post = require('./../../models/post');
var Bookmark = require('./../../models/bookmark');

var auth = require('./../../middlewares/auth')();
const router = express.Router();

router.get('/', auth.authenticate(), (req, res, next) => {
    console.log("comment");

});

router.post('/', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const postId = req.body.post;
    Post.findByPost(postId).then((post) => {
        if ( !post ) {
            return res.status(500).json(utils.getResponseResult({}, 0, 'Invalid STL info.'));
        }
        Like.like(userId, req.body, post['owner']).then((like) => {
            if (like) {
                res.json(utils.getResponseResult(like, 1, ''));
            } else {
                res.json(utils.getResponseResult({}, 1, ''));
            }
        }, (error) => {
            return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
        });
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
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

router.get('/countByUser/:userId', (req, res, next) => {
    //const userId = req.body.userId;
    const userId = req.params.userId;
    Like.countByUser(userId).then(async (count) => {
        res.json(utils.getResponseResult({count:count}, 1, ''));
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});


module.exports = router;