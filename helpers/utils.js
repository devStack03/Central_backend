exports.getResponseResult = (data, success, error) => {
    var result = {};

    result["data"] = data;
    result["success"] = success;
    result["error"] = error;

    return result;
};


exports.customizedUserInfo = customizedUserInfo;

function customizedUserInfo(doc) {
    var result = {
        id: doc._id.toString(),
        type: doc.type,
        username: doc.username,
        email: doc.email,
        gender: doc.gender,
        isNewUser: doc.isNewUser,
        isFlagged: doc.isFlagged,
        isVerified: doc.isVerified,
        isDeleted: doc.isDeleted,
        firstName: doc.firstName,
        lastName: doc.lastName,
        facebookId: doc.o_auth ? (doc.o_auth.facebook ? doc.o_auth.facebook.id : '') : '',
        googleId: doc.o_auth ? (doc.o_auth.google ? doc.o_auth.google: '') : '',
        avatar: doc.avatar ? doc.avatar : '',
        bgImage: doc.bgImage ? doc.bgImage : '',
        age: doc.age,
        bio: doc.bio,
        country: doc.country,
        website: doc.website,
        phone: doc.phone,
        notification : { email: doc.notification? doc.notification.email : false, push: doc.notification? doc.notification.push : false},
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };

    return result;
}