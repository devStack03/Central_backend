var express = require("express");
var mongoose = require('mongoose');
var utils = require('./../../helpers/utils');
var User = require('./../../models/user');
var Post = require('./../../models/post');
var Comment = require('./../../models/comment');
var Like = require('./../../models/like');

var auth = require('./../../middlewares/auth')();
const router = express.Router();

router.get('/load/:loaded/:postId', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const loaded = parseInt(req.params.loaded, 10);
    const postId = req.params.postId;
    Comment.findByPost(postId).then(async (comments) => {
        var result = [];
        for (var i = loaded ; i < comments.length && i < loaded+20  ; i++) {
            // const user = await User.findUserById(comments[i].commenter._id.toString());
            // comments[i].commenter = {username : user.username, _id:user._id};
            // let like = await Like.findByUserAndPost(userId, comments[i]._id.toString());
            // if (like) {
            //     comments[i].myLiked = true;
            // } else {
            //     comments[i].myLiked = false;
            // }
            result.push(comments[i]);
        }
        res.json(utils.getResponseResult({comments:result, total: comments.length}, 1, ''));
    });

});

router.post('/', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const postId = req.body.post;
    Post.findByPost(postId).then((post) => {
        if ( !post ) {
            return res.status(500).json(utils.getResponseResult({}, 0, 'Invalid STL info.'));
        }
        Comment.createNewComment(userId, req.body, post).then( async (comment) => {
            let commentCount = await Comment.countByPost(req.body.post);
            if (comment) {
                res.json(utils.getResponseResult({count: commentCount, comment: comment}, 1, ''));
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

router.get('/:id', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
});

module.exports = router;