const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const toJson = require('@meanie/mongoose-to-json');
const Schema = mongoose.Schema;
const UserSchema = require('./user');
const NotificationSchema = require('./notification');//mongoose.model('Notification');
const FollowSchema = require('./follow');//mongoose.model('Follow');
var aws = require('../helpers/aws');

const PostSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: '', required: true },
    tags: { type: [String], default: []},
    photos: { type: [String], default: []},
    description: { type: String, default: '' },

    assetFile: { type: String, default: ''},
    assetType: { type: Number, default: 1}, // 1: image, 2: 3d file, 
    coins: { type: Number, default: 0},     // 0: free, 
    
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0},

    isFlagged: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

PostSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'post'
});

PostSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// PostSchema.set('toJSON', {
//     virtuals: true
// });

PostSchema.pre('findOne', autoPopulateComments);
PostSchema.pre('find', autoPopulateComments);


function autoPopulateComments(next) {
    this.populate({
        path: 'comments',
        options: {
            limit: 3,
            sort: { createdAt: -1 },
            populate: {
                path: 'commenter',
                select: 'username'
            }
        }
    });
    next();
}



PostSchema.statics.createNewPost = function (userId, params) {
    let data = params;
    data['owner'] = userId;
    let _data = JSON.stringify(data);
    const post = new this(data);

    return post.save();
};

PostSchema.post('save', function(doc) {
    UserSchema.increasePostCount(doc.owner);

    // find followers and send noification for uploading a post....
    FollowSchema.getFollowers(doc.owner).then((followers) => {
        if (followers) {
            followers.forEach(element => {
                const sender = element.followee;
                const receiver = element.follower;

                const msg = sender.firstName + ' ' + sender.lastName + ' uploaded item ' + doc.title;
                const post = doc._id;

                NotificationSchema.createNotification(sender._id, receiver._id, msg, 6, post);

                if (receiver.notification && receiver.notification.email) {
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

PostSchema.post('remove', function (doc) {
    UserSchema.decreasePostCount(doc.owner);
});


PostSchema.statics.updatePostById = function (postId, params) {
    return this.findByIdAndUpdate(postId, { $set: params }, { new: true })
        .lean()
        .exec();
}

PostSchema.statics.increaseViewCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'viewCount': 1 } }).exec();
}

PostSchema.statics.decreaseViewCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'viewCount': -1 } }).exec();
}

PostSchema.statics.increaseLikeCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'likeCount': 1 } }).exec();
}

PostSchema.statics.decreaseLikeCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'likeCount': -1 } }).exec();
}


PostSchema.statics.increaseDownloadCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'downloadCount': 1 } }).exec();
}

PostSchema.statics.decreaseDownloadCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'downloadCount': -1 } }).exec();
}


PostSchema.statics.increaseBookmarkCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'bookmarkCount': 1 } }).exec();
}

PostSchema.statics.decreaseBookmarkCount = function (postId) {
    return this.findByIdAndUpdate(postId, { $inc: { 'bookmarkCount': -1 } }).exec();
}


PostSchema.statics.findByUser = function (userId, start, count) {

    // return this.aggregate([
    //     { $match: { owner: mongoose.Types.ObjectId(userId) } },
    //     {
    //         $lookup: {
    //             from: 'likes',
    //             localField: '_id',
    //             foreignField: 'post',
    //             as: 'likes'
    //         }
    //     }
    // ])
    //     .exec();

    return this.find({
        owner: userId
    })
        .populate('owner')
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(count)
        .lean()
        .exec();
}

PostSchema.statics.findByPost = function (postId) {
    return this.findById(postId)
        .populate('owner')
        .lean()
        .exec();
}

PostSchema.statics.getTagCandidates = async function (searchTerm) {
    return this.aggregate([
        {$unwind:"$tags"},
        {$group:{"_id":"$tags"}}
    ])
    .exec();
}

PostSchema.statics.populateAndSort = async function (search, sortby, filterObj, start, count) {
    var sortbyObj = {downloadCount: -1, viewCount: -1, _id: -1 };
    switch (sortby) {
        case 'mp':
            sortbyObj = {downloadCount: -1, viewCount: -1, _id: -1 };
            break;
        case 'md':
            sortbyObj = {downloadCount: -1, _id: -1 };
            break;
        case 'ml':
            sortbyObj = {likeCount: -1, _id: -1 };
            break;
        case 'mr':
            sortbyObj = {createdAt: -1, _id: -1 };
            break;
        case 'd':
            sortbyObj = {downloadCount: -1, _id: -1 };
            break;
        case 'v':
            sortbyObj = {viewCount: -1, _id: -1 };
            break;
        case 'l':
            sortbyObj = {likeCount: -1, _id: -1 };
            break;
        case 'b':
            sortbyObj = {bookmarkCount: -1, _id: -1 };
            break;
        case 'nf':
            sortbyObj = {createdAt: -1, _id: -1 };
            break;
        case 'of':
            sortbyObj = {createdAt: 1, _id: -1 };
            break;
        case 'ph':
            sortbyObj = {coins: -1, _id: -1 };
            break;
        case 'pl':
            sortbyObj = {coins: 1, _id: -1 };
            break;
    }

    var filterByUploaded = {};
    var filterByPrice = {};
    var filterByDownloads = {};
    var filterByLikes = {};
    var filterByPubCount = {};
    var filterByPubKudos = {};

    var d = new Date(),
    hour = d.getHours(),
    min = d.getMinutes(),
    month = d.getMonth() + 1,
    year = d.getFullYear(),
    sec = d.getSeconds(),
    day = d.getDate();

    var cutoff = new Date(year+','+month+','+day);
    switch (filterObj.uploaded)
    {
        case 'td':
            break;
        case 'week':
            cutoff.setDate(day - 7);
            break;
        case 'month':
            cutoff = new Date(year+','+month);
            break;
        case 'halfyear':
            cutoff.setDate(day - 180);
            break;
        case 'lastyear':
            cutoff = new Date(year);
            break;
    }
    if (filterObj.uploaded != 'none')
        filterByUploaded = {"createdAt": {$gt: cutoff}};

    switch (filterObj.price)
    {
        case 'u1':
            filterByPrice = {"coins": {$lt: 1}};
            break;
        case 'u5':
            filterByPrice = {"coins": {$lt: 5}};
            break;
        case 'u10':
            filterByPrice = {"coins": {$lt: 10}};
            break;
        case 'u25':
            filterByPrice = {"coins": {$lt: 25}};
            break;
        case 'o25':
            filterByPrice = {"coins": {$gt: 25}};
            break;
    }

    switch (filterObj.downloads)
    {
        case 'mt10':
            filterByDownloads = {"downloadCount": {$gt: 10}};
            break;
        case 'mt50':
            filterByDownloads = {"downloadCount": {$gt: 50}};
            break;
        case 'mt100':
            filterByDownloads = {"downloadCount": {$gt: 100}};
            break;
        case 'mt1000':
            filterByDownloads = {"downloadCount": {$gt: 1000}};
            break;
        case 'mt10000':
            filterByDownloads = {"downloadCount": {$gt: 10000}};
            break;
    }

    switch (filterObj.likes)
    {
        case 'mt10':
            filterByLikes = {"likeCount": {$gt: 10}};
            break;
        case 'mt50':
            filterByLikes = {"likeCount": {$gt: 50}};
            break;
        case 'mt100':
            filterByLikes = {"likeCount": {$gt: 100}};
            break;
        case 'mt1000':
            filterByLikes = {"likeCount": {$gt: 1000}};
            break;
        case 'mt10000':
            filterByLikes = {"likeCount": {$gt: 10000}};
            break;
    }

    let minPubCount = 0;
    let users = [];
    let pubUsers = [];
    switch (filterObj.pubcount) {
        case 'mt5':
            minPubCount = 5;
            break;
        case 'mt10':
            minPubCount = 10;
            break;
        case 'mt50':
            minPubCount = 50;
            break;
        case 'mt100':
            minPubCount = 100;
            break;
    }

    if ( minPubCount > 0 ) {
        users = await UserSchema.find({"postCount": {$gt: minPubCount}});
        for ( var i = 0 ; i < users.length && i < 100; i++ ) {
            pubUsers.push(users[i]['_id']);
        }
        filterByPubCount = { 'owner': { $in: pubUsers } };
        
    }

    let minKudoCount = 0;
    let kudoUsers = [];
    switch (filterObj.pubkudos) {
        case 'mt5':
            minKudoCount = 5;
            break;
        case 'mt10':
            minKudoCount = 10;
            break;
        case 'mt50':
            minKudoCount = 50;
            break;
        case 'mt100':
            minKudoCount = 100;
            break;
        case 'mt1000':
            minKudoCount = 1000;
            break;
    }

    if ( minKudoCount > 0 ) {
        users = await UserSchema.find({"kudoCount": {$gt: minKudoCount}});
        for ( var i = 0 ; i < users.length && i < 100; i++ ) {
            kudoUsers.push(users[i]['_id']);
        }
        filterByPubKudos = { 'owner': { $in: kudoUsers } };
    }
    

    if ( search == "" ) {
        return this.find({ /*$or: [{ 'type': 2 }, { 'type': 3 }]*/ } )
            .populate('owner')
            .sort(sortbyObj)
            .skip(start)
            .limit(count)
            .lean()
            .exec();
    } 
    return this.find(
        { $and:
            [
                /*{ $or: [{ 'type': 2 }, 
                        { 'type': 3 }] 
                },*/

                {
                    $or: [
                            {"title": { $regex : search, $options: 'i'  }},
                            {"tags": { $regex : search, $options: 'i'  }}
                        ]
                },
                filterByUploaded,
                filterByPrice,
                filterByDownloads,
                filterByLikes,
                filterByPubCount,
                filterByPubKudos,
            ]
        })
        .sort(sortbyObj)
        .populate('owner')
        //.find(filterByPubCount)
        .skip(start)
        .limit(count)
        .lean()
        
        
        .exec();
}

// PostSchema.statics.populateByLikeCount = function (search) {
//     if ( search == "" ) {
//         return this.find({ /*$or: [{ 'type': 2 }, { 'type': 3 }]*/ } ).populate('owner')
//             .sort({ likeCount: -1, _id: -1 })
//             .lean()
//             .exec();
//     } 
//     return this.find(
//         { $and:
//             [
//                 /*{ $or: [{ 'type': 2 }, 
//                         { 'type': 3 }] 
//                 },*/

//                 {"tags": { $regex : search  }}
//             ]
//         }).populate('owner')
//         .sort({ likeCount: -1, _id: -1 })
//         .lean()
//         .exec();
// }

PostSchema.statics.getPostsCount = async function (userId) {
    return this.countDocuments({
        owner: userId,
        isDeleted: false
    }).exec();
};


//PostSchema.index({ hashTags: 1 });
PostSchema.plugin(toJson);
PostSchema.plugin(uniqueValidator);
PostSchema.plugin(timestamps);
module.exports = mongoose.model('Post', PostSchema);