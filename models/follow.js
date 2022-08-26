const { mongo } = require('mongoose');
const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;

const User = require('./user');
const Notification = require('./notification');
const UserSchema = mongoose.model('User');
const NotificationSchema = mongoose.model('Notification');
var aws = require('../helpers/aws');

const FollowSchema = new Schema({
    followee: { type: Schema.Types.ObjectId, ref: 'User' },
    follower: { type: Schema.Types.ObjectId, ref: 'User' },
    followedAt: { type: Date, default: Date.now },
});

FollowSchema.statics.follow = function (followeeId, followerId) {
    const follow = new this({
        followee: followeeId,
        follower: followerId,
        followedAt: new Date()
    });

    return follow.save();
};

FollowSchema.statics.unfollow = async function (followeeId, followerId) {

    try {
        const follow = await this.findOne(
            { followee: followeeId, follower: followerId }
        ).exec();
        
            if (follow) {
                follow.remove();
            }
        
        
    } catch (error) {

    }
};

FollowSchema.post('save', function(doc) {
    // send notification for following
    UserSchema.findUserById(doc.follower).then((user) => {
        if (user) {
            const msg = user.firstName + ' ' + user.lastName + ' Followed You';
            NotificationSchema.createNotification(doc.follower, doc.followee, msg, 2, null);

            UserSchema.findUserById(doc.followee).then((followee) => {
                if (followee && followee.notification && followee.notification.email) {
                    // send email notification
                    aws.sendNotificationEmail(followee.notification.email, followee.firstName + ' ' + followee.lastName, msg, function (err, data) {
                        if (err) {
                            console.log('send notification email to ' + followee.email + ' failed');
                        } else {
                            //
                        }
                    });
                }
            });            
        }
    });
});

FollowSchema.post('remove', function (doc) {
    // send notification for unfollowing
    UserSchema.findUserById(doc.follower).then((user) => {
        if (user) {
            const msg = user.firstName + ' ' + user.lastName + ' Unfollowed You';
            NotificationSchema.createNotification(doc.follower, doc.followee, msg, 3, null);

            UserSchema.findUserById(doc.followee).then((followee) => {
                if (followee && followee.notification && followee.notification.email) {
                    // send email notification
                    aws.sendNotificationEmail(followee.email, followee.firstName + ' ' + followee.lastName, msg, function (err, data) {
                        if (err) {
                            console.log('send notification email to ' + followee.email + ' failed');
                        } else {
                            //
                        }
                    });
                }
            });

        }
    });
});

FollowSchema.statics.checkFollow = function (followeeId, followerId) {
    return this.findOne(
        { followee: followeeId, follower: followerId }
    )
        .exec();
};

FollowSchema.statics.getFollowers = async function (followeeId) {
    return this.find(
        {
            followee: followeeId,
        }
    )
        .populate('follower')
        .populate('followee')
        .select({
            follower: 1,
            followedAt: 1
        })
        //.limit(30)
        .lean()
        .exec();
};

FollowSchema.statics.getFollowings = async function (followerId) {
    return this.find(
        {
            follower: followerId
        }
    )
        .populate('followee')
        .populate('follower')
        .select({
            followee: 1,
            followedAt: 1
        })
        .limit(30)
        .lean()
        .exec();
};

FollowSchema.statics.getFollowerCount = async function (followeeId) {
    return this.count({
        followee: followeeId
    })
        .lean()
        .exec();
};

FollowSchema.statics.getFollowingCount = async function (followerId) {
    return this.countDocuments({
        follower: followerId,
        followedAt: null
    }).exec();
};

FollowSchema.statics.getTopFolloweeUsers = function (limit) {
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
            $group: {_id: "$followee", "count": {"$sum": 1}}
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


FollowSchema.plugin(uniqueValidator);
FollowSchema.plugin(timestamps);
module.exports = mongoose.model('Follow', FollowSchema);