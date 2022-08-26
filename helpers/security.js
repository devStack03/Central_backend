
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr';
var secret = require('../config').secret;
var jwt = require('jsonwebtoken');
var expire = require('../config.js').expire;


exports.getToken = function (id, username, next) {

    next(jwt.sign({ id: id, username: username, expiresIn: expire }, secret));

};
exports.verifyToken = verifyToken;
function verifyToken(token, callback) {
    try {
        var decoded = jwt.verify(token, secret);
        return callback(null, decoded);
    } catch (err) {
        return callback(err, null);
    }
}

exports.getClientId = getClientId;
function getClientId(code, id, next) {

    encrypt(code + "$" + random(7) + '$' + id + '$' + secret, function (clientId) {
        next(clientId);
    });

}
exports.ValidateClientId = function (clientId, next) {
    var decripted = decrypt(clientId);
    var id = decripted.split("$")[0];

    next(id)
};


function encrypt(text, next) {
    var cipher = crypto.createCipher(algorithm, secret);
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    next(crypted);
}

function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, secret);
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}
function random(howMany, chars) {
    chars = chars
        || "0123456789";
    var rnd = crypto.randomBytes(howMany)
        , value = new Array(howMany)
        , len = chars.length;

    for (var i = 0; i < howMany; i++) {
        value[i] = chars[rnd[i] % len]
    }

    return value.join('');
}

exports.random = random;