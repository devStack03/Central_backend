var express = require("express");
var mongoose = require('mongoose');
var utils = require('../../helpers/utils');
var User = require('../../models/user');
var Notification = require('../../models/notification');
var Like = require('../../models/like');
var Comment = require('../../models/comment');
var Bookmark = require('../../models/bookmark');
var Follow = require('../../models/follow');
const notification = require("../../models/notification");

var auth = require('../../middlewares/auth')();
const router = express.Router();

router.get('/:start/:count/:isNew', auth.authenticate(), async (req, res, next) => {
    const userId = req.headers['user-id'];
    const start = req.params.start;
    const count = req.params.count;
    const isRead = req.params.isNew == 'new' ? 0 : -1;
    try {
        let notifications = await Notification.findNotifications(userId, start, count, isRead);
        notifications.forEach(async notification =>  {
            await Notification.updateReadStatus(notification._id);
        });
        res.json(utils.getResponseResult(notifications, 1, ''));
    } catch (error) {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    }   
});

router.delete('/:id', auth.authenticate(), async (req, res, next) => {
    const userId = req.headers['user-id'];
    const id = req.params.id;
    try {
        await Notification.deleteById(userId, id);
        res.json(utils.getResponseResult({}, 1, ''));
    } catch (error) {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    }   
});


module.exports = router;