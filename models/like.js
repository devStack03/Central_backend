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


const LikeSchema = new Schema({
    liker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null},
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    //comment: {type: Schema.Types.ObjectId, ref: 'Comment', default: null},
    isLike: { type: Boolean, default: true },
});

LikeSchema.post('save', function(doc) {
    PostSchema.increaseLikeCount(doc.post);

    // send notification for liking post
    UserSchema.findUserById(doc.liker).then((sender) => {
        if (sender) {
            PostSchema.findById(doc.post).then((post) => {
                const msg = sender.firstName + ' ' + sender.lastName + ' Liked Your STL ' + post.title;
                NotificationSchema.createNotification(doc.liker, doc.owner, msg, 7, doc.post);

                UserSchema.findUserById(doc.owner).then((owner) => {
                    if (owner && owner.notification && owner.notification.email) {
                        // send email notification
                        aws.sendNotificationEmail(owner.email, owner.firstName + ' ' + owner.lastName, msg, function (err, data) {
                            if (err) {
                                console.log('send notification email to ' + owner.email + ' failed');
                            } else {
                                //
                            }
                        });
                    }
                });

            });
        }
    });
});

LikeSchema.post('remove', function (doc) {
    PostSchema.decreaseLikeCount(doc.post);
});


LikeSchema.statics.like = async function (userId, params, owner) {

    try {
        var post = params['post'] ? params['post'] : null;
        //var comment = params['comment'] ? params['comment'] : null;
        var likedBefore = await this.countDocuments({liker: userId, post: post/*, comment: comment*/});
    if (!likedBefore) {
        let data = {liker: userId, post: post, owner: owner};
        const like = new this(data);
        return like.save();
    } else {
       
        try {
            var doc = await this.findOne({liker: userId, post: post/*, comment: comment*/});
            return doc.remove();
        } catch (error) {
            return new Promise(null, error);
        }
    }
    } catch (error) {
        return new Promise(null, error);
    }
    
};

LikeSchema.statics.unlike = function (req, params) {
    var post = params['post'] ? params['post'] : null;
    //var comment = params['comment'] ? params['comment'] : null;
    const userId = req.headers['user-id'];

    return this.findOne({liker: userId, post: post/*, comment: comment*/})
        .remove()
        .exec();
}

LikeSchema.statics.findByUser = function (userId) {
    return this.find({
        liker: userId
    })
        .populate('liker')
        .lean()
        .exec();
}

LikeSchema.statics.findByPost = function (postId) {
    return this.find({
        post: postId
    })
        .lean()
        .exec();
}

LikeSchema.statics.countByUser = function (userId) {
    return this.count({
        liker: userId
    })
        .exec();
}

LikeSchema.statics.countByPost = function (postId) {
    return this.count({
        post: postId
    })
        .lean()
        .exec();
}

LikeSchema.statics.countByOwner = function (userId) {
    return this.count({
        owner: userId
    })
        .lean()
        .exec();
}

LikeSchema.statics.findByUserAndPost = function (userId, postId) {
    return this.findOne({
        liker:userId,
        post: postId
    }).exec();
}

LikeSchema.statics.findByUserAndComment = function (userId, commentId) {
    return this.findOne({
        liker:userId,
        comment: commentId
    }).exec();
}

LikeSchema.statics.getTopLikeUsers = function (limit) {
    return this.aggregate([
        // {
        //     $lookup: {
        //         from        : 'users',
        //         localField  : 'owner',
        //         foreignField: '_id',
        //         as          : 'user'
        //     }
        // },
        // { "$unwind": "$user" },
        {
            $match: {"isLike": true}
        },
        {
            $group: {_id: "$owner", "count": {"$sum": 1}}
        },
        {
            $sort: {"count": -1}
        },
        {
            $limit: limit
        }
    ])
    .exec();
}

LikeSchema.plugin(uniqueValidator);
LikeSchema.plugin(timestamps);
module.exports = mongoose.model('Like', LikeSchema);