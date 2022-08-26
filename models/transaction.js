const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const toJson = require('@meanie/mongoose-to-json');
const Schema = mongoose.Schema;
const UserSchema = mongoose.model('User');

const TransactionSchema = new Schema({

    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, default: 1, required: true},  // coin amount
    type: { type: Number, required: true},  // 1: download item, 2: give tip, 3: tap shared link, ...
    post: { type: Schema.Types.ObjectId, ref: 'Post'},
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
});

TransactionSchema.virtual('id').get(function() {
    return this._id.toHexString();
});


TransactionSchema.post('save', function(doc) {
    UserSchema.increaseBalance(doc.sender, -doc.amount);
    UserSchema.increaseBalance(doc.receiver, doc.amount);

    // send notification
});

TransactionSchema.post('remove', function (doc) {
    UserSchema.increaseBalance(doc.sender, doc.amount);
    UserSchema.increaseBalance(doc.receiver, -doc.amount);
});


TransactionSchema.statics.createNewTransaction = function (userId, params) {
    let data = params;
    data['sender'] = userId;
    let _data = JSON.stringify(data);
    const Transaction = new this(data);

    return Transaction.save();
};

TransactionSchema.statics.findBySender = function (userId) {

    return this.find({
        sender: userId
    })
        .populate('sender')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
}

TransactionSchema.statics.findByReceiver = function (userId) {

    return this.find({
        receiver: userId
    })
        .populate('receiver')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
}



TransactionSchema.statics.findBySenderAndReceiver = function (userId) {

    return this.find({
        $or : [
            {sender: userId},
            {receiver: userId}
        ]
    })
        .populate('sender')
        .populate('receiver')
        .populate('post')
        .sort({ createdAt: -1 })
        .lean()
        .exec();
}



TransactionSchema.statics.getTransactionsCountBySender = async function (userId) {
    return this.countDocuments({
        sender: userId,
        isDeleted: false
    }).exec();
};


TransactionSchema.statics.getTransactionsCountByReceiver = async function (userId) {
    return this.countDocuments({
        receiver: userId,
        isDeleted: false
    }).exec();
};

TransactionSchema.statics.getTopTipUsers = async function (limit) {
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
            $match: {"type": 2}
        },
        {
            $group: {_id: "$receiver", "totaltip": {"$sum": "amount"}}
        },
        {
            $sort: {"totaltip": -1}
        },
        {
            $limit: limit
        }
    ])
    .exec();
}

//TransactionSchema.index({ tags: 1 });
TransactionSchema.plugin(toJson);
TransactionSchema.plugin(uniqueValidator);
TransactionSchema.plugin(timestamps);
module.exports = mongoose.model('Transaction', TransactionSchema);