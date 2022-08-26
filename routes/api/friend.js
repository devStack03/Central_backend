var express = require("express");

var utils = require('../../helpers/utils');
var Follow = require('../../models/follow');
var Post = require('../../models/post');
var User = require('../../models/user');
var auth = require('../../middlewares/auth')();
const router = express.Router();

router.get('/', (req, res, next) => {
    console.log("friends");

});

// router.get('/:query',passport.authenticate('bearer', { session: false }),
//         oauth2Server.error(), 

//search friend
router.post('/searchFriends', auth.authenticate(), async (req, res, next) => {

    let searchQuery = req.body.query;
    let userId = req.body.userId;
    console.log("query == ", searchQuery);

    if (searchQuery.length < 3) {

        res.json([]);
    }

    const accounts = await Account.search(searchQuery);

    if (!accounts) {

        return res
            .status(404)
            .json(ResponseResult.getResponseResult({}, 0, "User not found"));
    } else {

        var result = [];

        for (var i = 0, len = accounts.length; i < len; i++) {
            var account = accounts[i];
            const friend = await Friend.checkFollow({
                followee: account._id,
                follower: mongoose.Types.ObjectId(userId)
            });

            var userData = {
                _id: account._id.toString(),
                username: account.username,
                avatar: account.common_profile.avatar,
                message_mode: account.user_setting.message_send_mode
            };

            if (friend) {
                if (friend.accept) {
                    userData["isFriend"] = true;
                } else {
                    userData["isFriend"] = false;
                    userData["sent"] = true;
                }

            } else {
                userData["isFriend"] = false;
                userData["sent"] = false;
            }
            result.push(userData);

        }
        res.json(ResponseResult.getResponseResult(result, 1, "success"));
    }
})

// get all friends
router.post('/allFriends', auth.authenticate(), (req, res, next) => {

    const userId = req.body.userId;

    Friend.getAllFriends(userId).then(friends => {
        if (friends) {
            console.log("Friends => :", friends);
            res.json(ResponseResult.getResponseResult(friends, 1, "success"));
        } else {
            return res
                .status(404)
                .json(ResponseResult.getResponseResult({}, 0, "Friend not found"));
        }
    });

});

// follow user
router.post('/:id/follow', auth.authenticate(), async (req, res, next) => {

    const followeeId = req.params.id;
    const userId = req.headers['user-id'];
    if (followeeId == userId) {
        return res.json(utils.getResponseResult({}, 0, "same user"));
    } else {
        // check whether the user is my friend or not
        const follow = await Follow.checkFollow(followeeId, userId);
        if (follow) {
            if (follow.unfollowedAt) {
                //already unfollowed
                await Follow.refollow(follow._id);
                // if ( data ) 
                {
                    res.json(utils.getResponseResult({}, 1, "success"));
                }
                //  else {
                //     return res.status(404).json(utils.getResponseResult({}, 0, "database failure"));
                // };
            } else {
                res.json(utils.getResponseResult({}, 0, "already followed"));
            }
        } else {

            //Follow user
            await Follow.follow(followeeId, userId);
            // if ( follow ) 
            {
                res.json(utils.getResponseResult(follow, 1, "success"));
            } 
            // else {
            //     return res.status(404).json(utils.getResponseResult({}, 0, "database failure"));
            // };
        }
    }
});

// unfollow user
router.post('/:id/unfollow', auth.authenticate(), async (req, res, next) => {

    const followeeId = req.params.id;
    const userId = req.headers['user-id'];
    
    if (followeeId == userId) {
        return res.status(404).json(utils.getResponseResult({}, 0, "same user"));
    } else {
        // check whether the user is my friend or not
        const follow = await Follow.checkFollow(followeeId, userId);
        if (follow) {
            if (follow.unfollowedAt) {
                //already unfollowed
                res.json(utils.getResponseResult({}, 0, "already unfollowed"));
                
            } else {
                Follow.unfollow(followeeId, userId).then((data) => {
                    res.json(utils.getResponseResult({}, 1, "success"));
                }, (error) => {
                    return res.status(404).json(utils.getResponseResult({}, 0, "database failure"));
                });
            }
        } else {
            //not followed yet
            res.json(utils.getResponseResult({}, 0, "not yet followed"));
        }
    }
});



/**
 * Invite friend using email
 *  @param {*} userId 
 * @param {*} username
 * * @param {*} email 
 */

router.post('/inviteFriendWithEmail', auth.authenticate(), async (req, res, next) => {

    const userId = req.body.userId;
    const username = req.body.username;
    const friendEmail = req.body.email;

    aws.sendInvitationEmail(username, friendEmail, function (error, result) {

        if (error) {
            return res
                .status(404)
                .json(ResponseResult.getResponseResult({}, 0, "Failed to send the mail"));

        } else {
            res.json(ResponseResult.getResponseResult({}, 1, "Succeed to send the invitation mail."));

        }
    });
});

/**
 * Invite friend using Phone number
 */

router.post('/inviteFriendWithPhone', auth.authenticate(), async (req, res, next) => {
    const userId = req.body.userId;
    const username = req.body.username;
    const phoneNumber = req.body.phone;
    var message = 'Hi, ' + username + ' invited you to enjoy the app  : ' + '\n' + config.appstoreUrl + '\n' + config.googleUrl;

    twilio.sendSms(phoneNumber, message, function (data, code) {

        if (code == 1) {

            res.json(ResponseResult.getResponseResult({}, 1, "Succeed to send the invitation message."));
        } else {

            return res
                .status(404)
                .json(ResponseResult.getResponseResult({}, 0, "Failed to send SMS"));
        }
    })
});

module.exports = router;