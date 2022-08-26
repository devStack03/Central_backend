var express = require("express");
var mongoose = require('mongoose');
var utils = require('../../helpers/utils');
var User = require('../../models/user');
var Transaction = require('../../models/transaction');
const Notification = require("../../models/notification");
var auth = require('../../middlewares/auth')();
const router = express.Router();
var aws = require('../../helpers/aws');

router.get('/receiver/:id', auth.authenticate(), (req, res, next) => {
    console.log("comment");
    const userId = req.params.id;
    Transaction.findByReceiver(userId).then((transactions)=>{
        if ( transactions ) {
            res.json(utils.getResponseResult(transactions, 1, ''));
        } else {
            res.json(utils.getResponseResult([], 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.get('/sender/:id', auth.authenticate(), (req, res, next) => {
    console.log("comment");
    const userId = req.params.id;
    Transaction.findBySender(userId).then((transactions)=>{
        if ( transactions ) {
            res.json(utils.getResponseResult(transactions, 1, ''));
        } else {
            res.json(utils.getResponseResult([], 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

getSenerAndReceiver = (req, res, next) => {
    const userId = req.headers['user-id'];
    const sortby = req.params.sortby;
    const searchTerm = req.params.searchTerm;

    Transaction.findBySenderAndReceiver(userId).then((transactions)=>{
        if ( transactions ) {
            switch (sortby) {
                case 'dn':
                    break;
                case 'do':
                    transactions.reverse();
                    break;
                case 'ah':
                    transactions.sort(function (a, b) {
                        if (a.amount < b.amount)
                            return 1;
                        if (a.amount > b.amount)
                            return -1;
                        // a must be equal to b
                        return 0;
                    });
                    break;
                case 'al':
                    transactions.sort(function (a, b) {
                        if (a.amount > b.amount)
                            return 1;
                        if (a.amount < b.amount)
                            return -1;
                        // a must be equal to b
                        return 0;
                    });
                    break;
                case 'df':
                    var temptrans = [];
                    for (var i = 0; i < transactions.length; i++) {
                        if (transactions[i].receiver._id == userId) {
                            temptrans.push(transactions[i]);
                        }
                    }
                    for (var i = 0; i < transactions.length; i++) {
                        if (transactions[i].sender._id == userId) {
                            temptrans.push(transactions[i]);
                        }
                    }
                    transactions = temptrans;
                    break;
                case 'cf':
                    var temptrans = [];

                    for (var i = 0; i < transactions.length; i++) {
                        if (transactions[i].sender._id == userId) {
                            temptrans.push(transactions[i]);
                        }
                    }

                    for (var i = 0; i < transactions.length; i++) {
                        if (transactions[i].receiver._id == userId) {
                            temptrans.push(transactions[i]);
                        }
                    }
                    
                    transactions = temptrans;
                    break;
            }

            if (searchTerm != '' && searchTerm != undefined) {
                transactions = transactions.filter(function (element) {
                    let userName = element.sender.firstName + ' ' + element.sender.lastName;
                    if (userId == element.sender._id) {
                        userName = element.receiver.firstName + ' ' + element.receiver.lastName;
                    }
                    let postName = '';
                    if (element.type == 1) {
                        postName = element.post.title;
                    }

                    if (userName.toUpperCase().indexOf(searchTerm.toUpperCase()) >= 0 || postName.toUpperCase().indexOf(searchTerm.toUpperCase()) >= 0) {
                        return true;
                    }
                    return false;
                });
            }

            return res.json(utils.getResponseResult(transactions, 1, ''));
        } else {
            return res.json(utils.getResponseResult([], 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
}

router.get('/getBySenderAndReceiver/:sortby/:searchTerm', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const sortby = req.params.sortby;
    const searchTerm = req.params.searchTerm;

    return getSenerAndReceiver(req, res, next);
});

router.get('/getBySenderAndReceiver/:sortby', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const sortby = req.params.sortby;
    const searchTerm = req.params.searchTerm;

    return getSenerAndReceiver(req, res, next);
});

router.post('/', auth.authenticate(), async (req, res, next) => {
    const userId = req.headers['user-id'];

    try {
        if ( !req.body.receiver || !req.body.type || !req.body.amount) {
            return res.json(utils.getResponseResult({}, 0, 'Invalid request params!'));
        }
        
        if ( userId == req.body.receiver) {
            return res.json(utils.getResponseResult({}, 0, 'Same User!'));
        }

        let sender = await User.findUserById(userId);
        let receiver = await User.findUserById(req.body.receiver);
        if ( !sender || !receiver ) {
            return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
        }

        if ( sender.balance < req.body.amount ) {
            return res.json(utils.getResponseResult({}, 0, 'Not enough balance'));
        }

        const transaction = await Transaction.createNewTransaction(userId, req.body);

        if (transaction) {
            // create notification for giving tip
            const msg = sender.firstName + ' ' + sender.lastName + ' Sent Tips ' + req.body.amount;
            Notification.createNotification(sender._id, receiver._id, msg, 5, null);

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

            return  res.json(utils.getResponseResult({}, 1, ''));
        } else {
            return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
        }
    } catch (error) {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    }
});

router.get('/getBalance', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    User.findById(userId).then((user)=>{
        if ( user ) {
            res.json(utils.getResponseResult({balance: user.balance}, 1, ''));
        } else {
            res.json(utils.getResponseResult([], 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

module.exports = router;
