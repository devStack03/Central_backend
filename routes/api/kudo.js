var express = require("express");
var mongoose = require('mongoose');
var utils = require('../../helpers/utils');
var User = require('../../models/user');
var Kudo = require('../../models/kudo');

var auth = require('../../middlewares/auth')();
const router = express.Router();

router.get('/receiver/:sortby', auth.authenticate(), (req, res, next) => {
    const sortby = req.params.sortby;
    const userId = req.headers['user-id'];
    Kudo.findByReceiver(userId, sortby).then((kudos)=>{
        if ( kudos ) {
            res.json(utils.getResponseResult(kudos, 1, ''));
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
    Kudo.findBySender(userId).then((kudos)=>{
        if ( kudos ) {
            res.json(utils.getResponseResult(kudos, 1, ''));
        } else {
            res.json(utils.getResponseResult([], 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.post('/', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];

    if ( userId == req.body.receiver) {
        return res.json(utils.getResponseResult({}, 0, 'Same User!'));
    }

    Kudo.getKudosCountBySenderAndRecevier(userId, req.body.receiver).then((count)=>{
        if ( count > 0 ) {
            res.json(utils.getResponseResult({}, 0, 'Already given kudo.'));
        } else {
            Kudo.createNewKudo(userId, req.body).then((kudo) => {
                if (kudo) {
                    res.json(utils.getResponseResult(kudo, 1, ''));
                } else {
                    res.json(utils.getResponseResult({}, 1, ''));
                }
            }, (error) => {
                return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
            });
        }
    }, (error)=>{
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
    
    
});

router.get('/countByReceiver/:userId', (req, res, next) => {
    //const userId = req.body.userId;
    const userId = req.params.userId;
    Kudo.getKudosCountByReceiver(userId).then(async (count) => {
        res.json(utils.getResponseResult({count:count}, 1, ''));
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

router.get('/isKudoSent/:receiver', auth.authenticate(), (req, res, next) => {
    const userId = req.headers['user-id'];
    const receiver = req.params.receiver;
    Kudo.findKudo(userId, receiver).then((kudos)=>{
        if ( kudos  ) {
            res.json(utils.getResponseResult({isKudoSent: true}, 1, ''));
        } else {
            res.json(utils.getResponseResult({isKudoSent: false}, 1, ''));
        }
    }, (error) => {
        return res.status(500).json(utils.getResponseResult({}, 0, 'Database error'));
    });
});

module.exports = router;