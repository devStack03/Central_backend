var express = require('express');
var router = express.Router();
const api = require('./api');
const path = require('path');

router.use('/api', api);

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

/* GET home page. */
// Catch all other routes and return the index file
router.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

module.exports = router;
