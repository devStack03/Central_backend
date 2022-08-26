const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const Post = require('./post');
const NotificationSchema = require('./notification');
const PostSchema = mongoose.model('Post');
const UserSchema = mongoose.model('User');
///const NotificationSchema = mongoose.model('Notification');
var aws = require('../helpers/aws');

const Schema = mongoose.Schema;


const VisitSchema = new Schema({
    visiter: { type: String, default: "" },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null},
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    //comment: {type: Schema.Types.ObjectId, ref: 'Comment', default: null},
    isVisit: { type: Boolean, default: true },
});


VisitSchema.statics.create = async function (visiterId, postId, ownerId) {
    try {
        var visitedBefore = await this.countDocuments({visiter: visiterId, post: postId});
        if (!visitedBefore && visiterId != ownerId) {
            await PostSchema.increaseViewCount(postId);
            let data = {visiter: visiterId, post: postId, owner: ownerId};
            const visit = new this(data);
            await visit.save();
            return true;
        } 
        return false;
    } catch (error) {
        return false;
    }
};


VisitSchema.statics.countByPost = function (postId) {
    return this.count({
        post: postId
    })
        .lean()
        .exec();
}

VisitSchema.plugin(uniqueValidator);
VisitSchema.plugin(timestamps);
module.exports = mongoose.model('Visit', VisitSchema);