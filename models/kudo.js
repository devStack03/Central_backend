const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const toJson = require('@meanie/mongoose-to-json');
const UserSchema = mongoose.model('User');
//const PostSchema = mongoose.model('Post');
const Schema = mongoose.Schema;
const NotificationSchema = mongoose.model('Notification');
var aws = require('../helpers/aws');

const KudoSchema = new Schema({

    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: Number, default: 1, required: true },  // 1: view item, 2: view profile
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
}, {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

KudoSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

KudoSchema.statics.createNewKudo = function (userId, params) {
    let data = params;
    data['sender'] = userId;
    let _data = JSON.stringify(data);
    const Kudo = new this(data);

    return Kudo.save();
};

KudoSchema.post('save', function(doc) {
    UserSchema.increaseKudoCount(doc.receiver);

    // send notification for giving kudo
    UserSchema.findUserById(doc.sender).then((user) => {
        if (user) {
            const msg = user.firstName + ' ' + user.lastName + ' Sent You Kudo';
            NotificationSchema.createNotification(doc.sender, doc.receiver, msg, 4, null);

            UserSchema.findUserById(doc.receiver).then((receiver) => {
                if (receiver && receiver.notification && receiver.notification.email) {
                    // send email notification
                    aws.sendNotificationEmail(receiver.email, receiver.firstName + ' ' + receiver.lastName, msg, function (err, data) {
                        if (err) {
                            console.log('send notification email to ' + receiver.email + ' failed');
                        } else {
                            //
                        }
                    });
                }
            });

        }
    });
});

KudoSchema.post('remove', function (doc) {
    UserSchema.decreaseKudoCount(doc.receiver);
});


KudoSchema.statics.findKudo = function (sender, receiver) {

    return this.findOne({
        sender: sender,
        receiver: receiver
    })
        .lean()
        .exec();
}

KudoSchema.statics.findBySender = function (userId) {

    return this.find({
        sender: userId
    })
        .populate('receiver')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
}

KudoSchema.statics.findByReceiver = function (userId, sortby) {

    var sort = { createdAt: -1 };
    if (sortby == 'of') {
        sort = { createdAt: 1 };
    }
    return this.find({
        receiver: userId
    })
        .populate('sender')
        .populate('receiver')
        .populate('post')
        .sort(sort)
        .lean()
        .exec();
}

KudoSchema.statics.getKudosCountBySenderAndRecevier = async function (senderId, receiverId) {
    return this.countDocuments({
        sender: senderId,
        receiver: receiverId,
        isDeleted: false
    }).exec();
};

KudoSchema.statics.getKudosCountBySender = async function (userId) {
    return this.countDocuments({
        sender: userId,
        isDeleted: false
    }).exec();
};


KudoSchema.statics.getKudosCountByReceiver = async function (userId) {
    return this.countDocuments({
        receiver: userId,
    }).exec();
    // return this.count({
    //     receiver: userId,
    // })
    //     .lean()
    //     .exec();
};


//KudoSchema.index({ tags: 1 });
KudoSchema.plugin(toJson);
KudoSchema.plugin(uniqueValidator);
KudoSchema.plugin(timestamps);
module.exports = mongoose.model('Kudo', KudoSchema);