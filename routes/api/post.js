var express = require("express");
var mongoose = require('mongoose');
var utils = require('./../../helpers/utils');
var User = require('./../../models/user');
var Post = require('./../../models/post');
var Like = require('./../../models/like');
var Comment = require('./../../models/comment');
var Bookmark = require('./../../models/bookmark');
var Follow = require('./../../models/follow');
var Visit = require('./../../models/visit');

var auth = require('./../../middlewares/auth')();
const router = express.Router();

router.get('/', auth.authenticate(), async (req, res, next) => {
    console.log("friends");
    const userId = req.headers['user-id'];
    try {
        let posts = await Post.findByUser(userId);
        let friends = await Follow.getFollowings(userId);
        for ( var i = 0 ; i < friends.length; i++ ) {
            let friendposts = await Post.findByUser(friends[i].followee._id.toString());
            for ( var k = 0 ; k < friendposts.length; k++ )
                posts.push(friendposts[k]);
        }
        posts.sort(function (a, b) {
            if (a.createdAt < b.createdAt)
              return 1;
            if (a.createdAt > b.createdAt)
              return -1;
            // a must be equal to b
            return 0;
        });
        
        for (var i = 0; i < posts.length; i++) {
            let post = posts[i];
            try {
                let like = await Like.findByUserAndPost(userId, post._id.toString());
                if (like) {
                    post.myLiked = true;
                } else {
                    post.myLiked = false;
                }

                let bookmark = await Bookmark.findByUserAndPost(userId, post._id.toString());
                if (bookmark) {
                    post.bookmark = true;
                } else {
                    post.bookmark = false;
                }

                let comments = await Comment.findByPost(post._id.toString());
                // post.comments = [];//comments.slice(0, 20);
                post.comments = comments.slice(0, 3);
                post.commentCount = await Comment.countByPost(post._id.toString());
            } catch (err) {
                return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
            }            
        }
        res.json(utils.getResponseResult(posts, 1, ''));
    } catch (error) {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    }
    
});

router.post('/populateByUser', (req, res, next) => {
    const userId = req.body.userId;
    var start = req.body.start;
    var count = req.body.count;

    Post.findByUser(userId, start, count).then(async (posts) => {
        var result = [];
        for (var i = 0 ; i < posts.length && i < 12  ; i++) {
            result.push(posts[i]);
        }
        res.json(utils.getResponseResult({post:result, total: posts.length}, 1, ''));
    });
});

router.get('/getTagCandidates', (req, res, next) => {
    Post.getTagCandidates('').then(async (tags)=>{
        if ( tags ) {
            var candidateTags = [];
            tags.forEach(element => {
                candidateTags.push(element._id);
            });
            res.json(utils.getResponseResult(candidateTags, 1, ''));
        } else {
            res.json(utils.getResponseResult([], 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.get('/getTagCandidates/:searchTerm', (req, res, next) => {
    const searchTerm = req.params.searchTerm;
    Post.getTagCandidates(searchTerm).then(async (tags)=>{
        if ( tags ) {
            var candidateTags = [];
            tags = tags.filter((em) => {
                if (em._id.toUpperCase().indexOf(searchTerm.toUpperCase()) >= 0)
                    return true;
                return false;
            });
            tags.forEach(element => {
                candidateTags.push(element._id);
            });
            res.json(utils.getResponseResult(candidateTags, 1, ''));
        } else {
            res.json(utils.getResponseResult([], 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});


// router.post('/populate', auth.authenticate(),  (req, res, next) => {
//     const userId = req.headers['user-id'];
//     const loaded = parseInt(req.body.loaded, 10);
//     var search = req.body.search ;
//     if (search) {
//         console.log('search');
//     } else {
//         search = '';
//     }
//     Post.populateByLikeCount(search).then(async (posts) => {
//         var result = [];
//         for (var i = loaded ; i < posts.length && i < loaded+12  ; i++) {
//             posts[i].src = posts[i].media;
//             posts[i].caption = posts[i].title;
//             posts[i].commentCount = await Comment.countByPost(posts[i]._id.toString());
//             posts[i].comments = [];
//             let like = await Like.findByUserAndPost(userId, posts[i]._id.toString());
//             if (like) {
//                 posts[i].myLiked = true;
//             } else {
//                 posts[i].myLiked = false;
//             }

//             let bookmark = await Bookmark.findByUserAndPost(userId, posts[i]._id.toString());
//             if (bookmark) {
//                 posts[i].bookmark = true;
//             } else {
//                 posts[i].bookmark = false;
//             }
//             const follow = await Follow.checkFollow(posts[i].owner._id.toString(), userId);
            
//             if (follow && !follow.unfollowedAt){
//                 posts[i].owner.isFollowing = true;
//             }
//             else {
//                 posts[i].owner.isFollowing = false;
//             }
//             result.push(posts[i]);
//         }
//         res.json(utils.getResponseResult({post:result, total: posts.length}, 1, ''));
//     });
// });

router.post('/populateAndSort', (req, res, next) => {
    const userId = req.headers['user-id'];
    var search = req.body.search ;
    if (search) {
        console.log('search');
    } else {
        search = '';
    }
    var sortby = req.body.sortby;
    var start = req.body.start;
    var count = req.body.count;
    var filterObj = req.body.filterObj;

    Post.populateAndSort(search, sortby, filterObj, start, count).then(async (posts) => {
        var result = [];
        for (var i = 0 ; i < posts.length; i++) {
            let post = posts[i];
            try {
                // let like = await Like.findByUserAndPost(userId, post._id.toString());
                // if (like) {
                //     post.myLiked = true;
                // } else {
                //     post.myLiked = false;
                // }

                // let bookmark = await Bookmark.findByUserAndPost(userId, post._id.toString());
                // if (bookmark) {
                //     post.bookmark = true;
                // } else {
                //     post.bookmark = false;
                // }

                // let comments = await Comment.findByPost(post._id.toString());
                // post.comments = comments.slice(0, 3);
                // post.commentCount = await Comment.countByPost(post._id.toString());
            } catch (err) {
                return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
            }

            result.push(posts[i]);
        }
        res.json(utils.getResponseResult({post:result, total: posts.length}, 1, ''));
    });
});

// router.post('/populate_move', auth.authenticate(),  (req, res, next) => {
//     const userId = req.headers['user-id'];
//     const postId = req.body.postId;
//     const direction = parseInt(req.body.direction, 10);
//     var search = req.body.search ;
//     if (search) {
//         console.log('search');
//     } else {
//         search = '';
//     }
//     Post.populateByLikeCount(search).then(async (posts) => {
//         var i = 0;
//         var result = {post:{}, index:0, count:0};
//         for ( i = 0 ; i < posts.length; i++ )
//             if ( posts[i]._id.toString() == postId )
//                 break;
//         if ( i < posts.length && i+direction >=0 && i+direction < posts.length ) {
//             result.post = posts[i+direction];
//             result.post.commentCount = await Comment.countByPost(result.post._id.toString());
//             result.post.comments = [];
//             let like = await Like.findByUserAndPost(userId, result.post._id.toString());
//             if (like) {
//                 result.post.myLiked = true;
//             } else {
//                 result.post.myLiked = false;
//             }

//             let bookmark = await Bookmark.findByUserAndPost(userId, result.post._id.toString());
//             if (bookmark) {
//                 result.post.bookmark = true;
//             } else {
//                 result.post.bookmark = false;
//             }

//             const follow = await Follow.checkFollow(result.post.owner._id.toString(), userId);
            
//             if (follow && !follow.unfollowedAt){
//                 result.post.owner.isFollowing = true;
//             }
//             else {
//                 result.post.owner.isFollowing = false;
//             }
//             result.index = i+direction;
//             result.count = posts.length;
//         }
//         res.json(utils.getResponseResult(result, 1, ''));
//     });
// });

router.get('/:post_id', (req, res, next) => {
    const userId = req.headers['user-id'];
    const sessionId = req._remoteAddress;
    
    Post.findByPost(req.params.post_id).then(async (post) => {
        if (post) {

            if (await Visit.create(userId ? userId : sessionId, post._id, post.owner) )
                post.viewCount++;
            // Post.increaseViewCount(post._id);

            //post.viewCount += 1;

            post.myLiked = false;
            post.bookmark = false;
            if (userId) {
                let like = await Like.findByUserAndPost(userId, post._id.toString());
                if (like) {
                    post.myLiked = true;
                } else {
                    post.myLiked = false;
                }

                let bookmark = await Bookmark.findByUserAndPost(userId, post._id.toString());
                if (bookmark) {
                    post.bookmark = true;
                } else {
                    post.bookmark = false;
                }
            }

            let comments = await Comment.findByPost(post._id.toString());
            post.comments = comments.slice(0, 3);
            post.commentCount = await Comment.countByPost(post._id.toString());
            
            res.json(utils.getResponseResult(post, 1, ''));
        } else {
            res.json(utils.getResponseResult({}, 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.put('/:post_id', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    Post.updatePostById(req.params.post_id, req.body).then((post) => {
        if (post) {
            res.json(utils.getResponseResult(post, 1, ''));
        } else {
            res.json(utils.getResponseResult({}, 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.post('/', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    Post.createNewPost(userId, req.body).then((post) => {
        if (post) {
            res.json(utils.getResponseResult(post, 1, ''));
        } else {
            res.json(utils.getResponseResult({}, 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.post('/bookmark-feed', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    Bookmark.bookmark(userId, req.body).then((bookmark) => {
        if (bookmark) {
            res.json(utils.getResponseResult(bookmark, 1, ''));
        } else {
            res.json(utils.getResponseResult({}, 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

module.exports = router;