var bcrypt = require('bcryptjs');

exports.generateHash = generateHash;
function generateHash(password) {
    // make a promisie
    return new Promise(
        (resolve, reject) => {
            bcrypt.hash(password, 8, (err, hash) => {
                if(err) {
                    // error occurred
                    return reject(err);
                }
                resolve(hash);
            })
        }
    )
}
exports.compareHash = compareHash;
 function compareHash(hash, password) {
    return new Promise(
        (resolve, reject) => {
            bcrypt.compare(password, hash, (err, result) => {
                if(err) {
                    // error occured
                    return reject(err);
                }
                resolve(result); // true or false
            })
        }
    )
}