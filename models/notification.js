const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const toJson = require('@meanie/mongoose-to-json');
//const UserSchema = mongoose.model('User');
// const PostSchema = mongoose.model('Post');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({

    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: Number, default: 1, required: true },  // 1: download post, 2: follow, 3: unfollow, 4: give kudo, 5: give tip, 6: upload post, 7: like post
    msg: { type: String, default: ''},
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
    isRead: { type: Number, default: 0}
}, {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

NotificationSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

NotificationSchema.statics.createNotification = function (sender, receiver, msg, type, post) {
    let data = {
        sender: sender,
        receiver: receiver,
        msg: msg,
        type: type,
        post: post
    };
    let _data = JSON.stringify(data);
    const Notification = new this(data);

    return Notification.save();
};

NotificationSchema.post('save', function(doc) {
    //UserSchema.increaseKudoCount(doc.receiver);
});

NotificationSchema.post('remove', function (doc) {
    //UserSchema.decreaseKudoCount(doc.receiver);
});

NotificationSchema.statics.updateReadStatus = function (id) {
    return this.findByIdAndUpdate(id, { isRead: 1 }, { new: true })
            .lean()
            .exec();
}

// isRead: 0 - unread, 1 - read, other(-1): not consider
NotificationSchema.statics.findNotifications = function (receiver, start, count, isRead) {

    var isReadObj = {};
    if (isRead == 0 || isRead == 1) {
        isReadObj = {"isRead": isRead};
    }

    if ( !(start instanceof Number) ) {
        start = Number.parseInt(start);
    }

    if ( !(count instanceof Number) ) {
        count = Number.parseInt(count);
    }

    return this.find({
        $and: [
            {$or: [
                {"receiver": receiver},
                {"receiver": null}
            ]},
            isReadObj
        ]
    })
        .populate('sender')
        .sort({createdAt: -1})
        .skip(start)
        .limit(count)
        .lean()
        .exec();
};

NotificationSchema.statics.getUnreadNotificationCount = function (receiver) {
    return this.countDocuments({
        receiver: receiver,
        isRead: 0
    }).exec();
};

NotificationSchema.statics.deleteById = function (userId, id) {
    var condObj = {receiver: userId};
    if (id != 'all') {
        condObj._id = id;
    }
    return this.remove(condObj).exec();
};


//KudoSchema.index({ tags: 1 });
NotificationSchema.plugin(toJson);
NotificationSchema.plugin(uniqueValidator);
NotificationSchema.plugin(timestamps);
module.exports = mongoose.model('Notification', NotificationSchema);