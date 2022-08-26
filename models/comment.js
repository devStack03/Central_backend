const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
var findHashtags = require('find-hashtags');

const Schema = mongoose.Schema;


const CommentSchema = new Schema({
    commenter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    hashTags: { type: [String], default: [], set: getHashTags },
});

function getHashTags(v) {
    return findHashtags(v);
}

CommentSchema.statics.createNewComment = function (userId, params, post) {
    let data = params;
    data['commenter'] = userId;
    data['hashTags'] = params['text'];
    data['owner'] = post['owner'];
    const comment = new this(data);
    return comment.save();
};

CommentSchema.statics.deleteComment = function (req, params) {
    const postId = params.post_id;
    const userId = req.headers['user-id'];

    return this.findOne({
        post: postId,
        commenter: userId
    })
        .remove()
        .exec();
}

CommentSchema.statics.findByUser = function (userId) {
    return this.find({
        commenter: userId
    })
        .populate('commenter')
        .lean()
        .exec();
}

CommentSchema.statics.findByPost = function (postId) {
    return this.find({
        post: postId
    }).sort({ "_id": -1 })
        .populate('commenter')
        .lean()
        .exec();
}

CommentSchema.statics.countByUser = function (userId) {
    return this.count({
        commenter: userId
    })
        .exec();
}

CommentSchema.statics.countByPost = function (postId) {
    return this.count({
        post: postId
    })
        .lean()
        .exec();
}

CommentSchema.index({ hashTags: 1 });
CommentSchema.plugin(uniqueValidator);
CommentSchema.plugin(timestamps);
module.exports = mongoose.model('Comment', CommentSchema);