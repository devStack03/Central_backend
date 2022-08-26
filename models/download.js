const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const Post = require('./post');
const Notification = require('./notification');

const PostSchema = mongoose.model('Post');
const Schema = mongoose.Schema;
const NotificationSchema = mongoose.model('Notification');
const UserSchema = mongoose.model('User');
var aws = require('../helpers/aws');
const notification = require('./notification');
const { parseTwoDigitYear } = require('moment');

const DownloadSchema = new Schema({
    downloader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null},
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

DownloadSchema.post('save', function(doc) {
    PostSchema.increaseDownloadCount(doc.post);

    // find owner and send notification for downloading a post...
    PostSchema.findByPost(doc.post).then((post) => {
        UserSchema.findUserById(doc.downloader).then((downloader) => {
            if (post && downloader) {
                const msg = downloader.firstName + ' ' + downloader.lastName + ' downloaded item '  + post.title;
                NotificationSchema.createNotification(downloader._id, post.owner._id, msg, 1, doc.post);

                if (post.owner.notification && post.owner.notification.email) {
                    // send email notification
                    aws.sendNotificationEmail(post.owner.email, post.owner.firstName + ' ' + post.owner.lastName, msg, function (err, data) {
                        if (err) {
                            console.log('send notification email to ' + post.owner.email + ' failed');
                        } else {
                            //
                        }
                    });
                }
            }
        });
    });
});

DownloadSchema.post('remove', function (doc) {
    PostSchema.decreaseDownloadCount(doc.post);
});

DownloadSchema.statics.createNewDownload = function (userId, params, post) {
    let data = params;
    data['downloader'] = userId;
    data['owner'] = post['owner'];
    let _data = JSON.stringify(data);
    const Download = new this(data);

    return Download.save();
};

DownloadSchema.statics.findByUser = function (userId) {
    return this.find({
        downloader: userId
    })
        .populate('downloader')
        .lean()
        .exec();
}

DownloadSchema.statics.findByPost = function (postId) {
    return this.find({
        post: postId
    })
        .lean()
        .exec();
}

DownloadSchema.statics.countByOwner = function (userId) {
    return this.count({
        owner: userId
    })
        .exec();
}


DownloadSchema.statics.countByUser = function (userId) {
    return this.count({
        downloader: userId
    })
        .exec();
}

DownloadSchema.statics.countByPost = function (postId) {
    return this.count({
        post: postId
    })
        .lean()
        .exec();
}

DownloadSchema.statics.findByUserAndPost = function (userId, postId) {
    return this.findOne({
        downloader:userId,
        post: postId
    }).exec();
}

DownloadSchema.statics.findByUserAndComment = function (userId, commentId) {
    return this.findOne({
        liker:userId,
        comment: commentId
    }).exec();
}

DownloadSchema.statics.getTopDownloadUsers = function(limit) {
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


DownloadSchema.plugin(uniqueValidator);
DownloadSchema.plugin(timestamps);
module.exports = mongoose.model('Download', DownloadSchema);