const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const Post = require('./post');
const Notification = require('./notification');
const PostSchema = mongoose.model('Post');
const Schema = mongoose.Schema;


const BookmarkSchema = new Schema({
    bookmarkr: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null},
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isBookmark: { type: Boolean, default: true },
});

BookmarkSchema.post('save', function(doc) {
    PostSchema.increaseBookmarkCount(doc.post);
});

BookmarkSchema.post('remove', function (doc) {
    PostSchema.decreaseBookmarkCount(doc.post);
});


BookmarkSchema.statics.bookmark = async function (userId, params, owner) {

    try {
        var post = params['post'] ? params['post'] : null;
        //var comment = params['comment'] ? params['comment'] : null;
        var isBookmark = params['isBookmark'] ? params['isBookmark'] : true;
        var bookmarkdBefore = await this.countDocuments({bookmarkr: userId, post: post/*, comment: comment*/});

    if (!bookmarkdBefore) {
        let data = {bookmarkr: userId, post: post, owner: owner, isBookmark: isBookmark};
        const bookmark = new this(data);
        return bookmark.save();
    } else {
       
        try {
            var doc = await this.findOne({bookmarkr: userId, post: post/*, comment: comment*/});
            return doc.remove();
        } catch (error) {
            return new Promise(null, error);
        }
    }
    } catch (error) {
        return new Promise(null, error);
    }
    
};

BookmarkSchema.statics.unbookmark = function (req, bookmarkId) {
    // var post = params['post'] ? params['post'] : null;
    //var comment = params['comment'] ? params['comment'] : null;
    const userId = req.headers['user-id'];

    return this.findById(bookmarkId)
        .remove()
        .exec();
}

BookmarkSchema.statics.findByUser = function (userId) {
    return this.find({
        bookmarkr: userId
    })
        .populate('bookmarkr')
        .populate('owner')
        .populate('post')
        .lean()
        .exec();
}

BookmarkSchema.statics.findByPost = function (postId) {
    return this.find({
        post: postId
    })
        .lean()
        .exec();
}

BookmarkSchema.statics.findByComment = function (commentId) {
    return this.find({
        comment: commentId
    })
        .lean()
        .exec();
}

BookmarkSchema.statics.countByUser = function (userId) {
    return this.count({
        bookmarkr: userId
    })
        .exec();
}

BookmarkSchema.statics.countByPost = function (postId) {
    return this.count({
        post: postId
    })
        .lean()
        .exec();
}

BookmarkSchema.statics.findByUserAndPost = function (userId, postId) {
    return this.findOne({
        bookmarkr:userId,
        post: postId
    }).exec();
}

BookmarkSchema.statics.findByUserAndComment = function (userId, commentId) {
    return this.findOne({
        bookmarkr:userId,
        comment: commentId
    }).exec();
}

BookmarkSchema.plugin(uniqueValidator);
BookmarkSchema.plugin(timestamps);
module.exports = mongoose.model('Bookmark', BookmarkSchema);