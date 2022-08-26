const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const timestamps = require('mongoose-timestamp');
var uniqueValidator = require('mongoose-unique-validator');
const SALT_WORK_FACTOR = 10;
const Schema = mongoose.Schema;

var validateEmail = function (email) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email)
};

const UserSchema = new Schema({
    type: { type: Number, required: true }, //  1: email , 2: gmail , 3: facebook
    o_auth: {
        facebook: {
            id: String,
            access_token: String
        },
        google: {
            id: String,
            access_token: String
        }
    },
    password: { type: String },
    username: { type: String },
    phone: { type: String, default: '' },
    firstName: { type: String, default: 'Firstname' },
    lastName: { type: String, default: 'Lastname' },
    name: { type: String, default: '' },
    gender: { type: Number, default: 2 }, //1: Male , 0: Female, 2: None
    country: { type: String, default: 'us' },
    age: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    website: { type: String, default: '' },
    avatar: { type: String, default: 'assets/images/avatars/profile.jpg' },
    bgImage: { type: String, default: '' },
    isFlagged: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isNewUser: { type: Boolean, default: false },
    //isFollowing: { type: Boolean, default: false },
    balance: { type: Number, default: 10 },  // balance coins
    postCount: { type: Number, default: 0 },  // number of posts uploaded
    kudoCount: { type: Number, default: 0 },  // number of kudos
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        //validate: [validateEmail, 'Please fill a valid email address'],
        //match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w+)+$/, 'Please fill a valid email address']
    },
    notification: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
    }
});

// UserSchema.pre('save', function (next) {
//     const user = this;
//     if (user.type === 1) {
//         bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
//             if (err) return next(err);
//             bcrypt.hash(user.password, salt, function (err, hash) {
//                 if (err) return next(err);
//                 user.password = hash;
//                 next();
//             });
//         });
//     }
// });

UserSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

/**
 * Static
 */

UserSchema.statics.findUserById = function (userId) {
    return this.findById(userId).exec();
}

UserSchema.statics.findUser = async function (email) {

   // return this.findOne({ 'username': username }).exec();
   return this.findOne({ 'email': email }).exec();
}

UserSchema.statics.unregister = function (UserSchemaId) {

    return this.remove({ _id: UserSchemaId }).exec();
}

UserSchema.statics.findUserByEmail = function (email) {
    return this.findOne({ 'email': email }).exec();
}

UserSchema.statics.findUserByFacebookId = function (id) {
    return this.findOne({ 'o_auth.facebook.id': id });
}

UserSchema.statics.findUserByGoogleId = function (id) {
    return this.findOne({ 'o_auth.google.id': id });
}

UserSchema.statics.increaseBalance = function (id, amount) {
    return this.findByIdAndUpdate(id, { $inc: { 'balance': amount } }).exec();
}

UserSchema.statics.increasePostCount = function (userId) {
    return this.findByIdAndUpdate(userId, { $inc: { 'postCount': 1 } }).exec();
}

UserSchema.statics.decreasePostCount = function (userId) {
    return this.findByIdAndUpdate(userId, { $inc: { 'postCount': -1 } }).exec();
}

UserSchema.statics.increaseKudoCount = function (userId) {
    return this.findByIdAndUpdate(userId, { $inc: { 'kudoCount': 1 } }).exec();
}

UserSchema.statics.decreaseKudoCount = function (userId) {
    return this.findByIdAndUpdate(userId, { $inc: { 'kudoCount': -1 } }).exec();
}


UserSchema.statics.updateUserById = function (userId, params) {
    return this.findByIdAndUpdate(userId, { $set: params }, { new: true })
        .lean()
        .exec();
}

UserSchema.statics.removeCurrentAvatar = function (userId) {
    return this.findByIdAndUpdate(userId, { avatar: null }, { new: true })
        .lean()
        .exec();
};

UserSchema.statics.updateCurrentAvatar = function (userId, picUrl) {
    return this.findByIdAndUpdate(userId, { avatar: picUrl }, { new: true })
    .lean()
    .exec();
};

UserSchema.statics.updateSettings = function (userId, country, notification) {
    return this.findByIdAndUpdate(userId, { country: country, notification: notification }, { new: true })
    .lean()
    .exec();
};

UserSchema.statics.populateByFollowers = function (myId) {
    return this.find({ '_id': { $ne: myId } })
    .limit(20)
    .sort({'createdAt': -1})
    .exec();
};

UserSchema.statics.getTopKudos = function (limit) {
    return this.find({})
        .limit(limit)
        .sort({'kudoCount': -1})
        .lean()
        .exec();
}

UserSchema.statics.getTopPosts = function (limit) {
    return this.find({})
        .limit(limit)
        .sort({'postCount': -1})
        .lean()
        .exec();
}

UserSchema.statics.findByIdArray = function (idArray) {
    return this.find(
        { '_id': { $in: idArray } }
    )
    .lean()
    .exec();
}

UserSchema.plugin(uniqueValidator);
UserSchema.plugin(timestamps);
module.exports = mongoose.model('User', UserSchema);