var express = require('express');
var router = express.Router();
var auth = require('./auth');
const path = require('path');
router.use('/auth', auth);
router.use('/post', require('./post'));
router.use('/like', require('./like'));
router.use('/bookmark', require('./bookmark'));
router.use('/comment', require('./comment'));
router.use('/download', require('./download'));
router.use('/user', require('./user'));
router.use('/friend', require('./friend'));
router.use('/kudo', require('./kudo'));
router.use('/transaction', require('./transaction'));
router.use('/notification', require('./notification'));
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;