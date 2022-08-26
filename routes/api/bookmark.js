var express = require("express");
var mongoose = require('mongoose');
var utils = require('../../helpers/utils');
var User = require('../../models/user');
var Post = require('../../models/post');
var Bookmark = require('../../models/bookmark');

var auth = require('../../middlewares/auth')();
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
        Bookmark.bookmark(userId, req.body, post['owner']).then((bookmark) => {
            if (bookmark) {
                res.json(utils.getResponseResult(bookmark, 1, ''));
            } else {
                res.json(utils.getResponseResult({}, 1, ''));
            }
        }, (error) => {
            return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
        })
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.delete('/:id', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const bookmarkId = req.params.id;
    Bookmark.unbookmark(req, bookmarkId).then((data) => {
        if (data) {
            res.json(utils.getResponseResult(data, 1, ''));
        } else {
            res.json(utils.getResponseResult({}, 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.get('/getByUser/:sortby', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const sortby = req.params.sortby;

    if (userId) {
        Bookmark.findByUser(userId).then((bookmarks) => {
            if (bookmarks && bookmarks.length > 0) {
                switch (sortby) {
                    case 'nf':
                        bookmarks.sort(function (a, b) {
                            if (a.post.createdAt < b.post.createdAt)
                                return 1;
                            if (a.post.createdAt > b.post.createdAt)
                                return -1;
                            // a must be equal to b
                            return 0;
                        });
                        break;
                    case 'of':
                        bookmarks.sort(function (a, b) {
                            if (a.post.createdAt > b.post.createdAt)
                                return 1;
                            if (a.post.createdAt < b.post.createdAt)
                                return -1;
                            // a must be equal to b
                            return 0;
                        });
                        break;
                    case 'md':
                        bookmarks.sort(function (a, b) {
                            if (a.post.downloadCount < b.post.downloadCount)
                                return 1;
                            if (a.post.downloadCount > b.post.downloadCount)
                                return -1;
                            // a must be equal to b
                            return 0;
                        });
                        break;
                    case 'ld':
                        bookmarks.sort(function (a, b) {
                            if (a.post.downloadCount > b.post.downloadCount)
                                return 1;
                            if (a.post.downloadCount < b.post.downloadCount)
                                return -1;
                            // a must be equal to b
                            return 0;
                        });
                        break;
                }

                return res.json(utils.getResponseResult(bookmarks, 1, 'success'));
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



module.exports = router;