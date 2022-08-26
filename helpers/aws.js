var config = require('../config.js');
var node_ses = require('node-ses'), 
    client = node_ses.createClient({key:config.awsEmailSender.accessKeyId, secret: config.awsEmailSender.secretAccessKey});
var AWS = require('aws-sdk');
var email_config = {
    from: 'Pixstagram <andersson1117@gmail.com>'
};

var offline = process.env.OFFLINEWORK || false;

function awsSendEmail(from_email, to_email_list, subject, message, callback) {
    try {

        AWS.config.update(config.awsEmailSender);

        var params_email = {};
        var ses = new AWS.SES();
        if (Array.isArray(to_email_list)) {
            params_email = {
                Destination: {
                    ToAddresses: to_email_list
                },
                Message: {
                    Body: {
                        Html: {
                            Data: message,
                            Charset: 'utf8'
                        }
                    },
                    Subject: {
                        Data: subject,
                        Charset: 'utf8'
                    }
                },
                Source: from_email,
                ReplyToAddresses: [
                    from_email

                ],
                ReturnPath: from_email
            };
            ses.sendEmail(params_email, function (err, data) {
                if (err) callback(err, null);
                else callback(null, data);
            });

        } else {
            params_email = {
                Destination: {
                    ToAddresses: [
                        to_email_list
                    ]
                },
                Message: {
                    Body: {
                        Html: {
                            Data: message,
                            Charset: 'utf8'
                        }
                    },
                    Subject: {
                        Data: subject,
                        Charset: 'utf8'
                    }
                },
                Source: from_email,
                ReplyToAddresses: [
                    from_email
                ],
                ReturnPath: from_email
            };
            ses.sendEmail(params_email, function (err, data) {
                console.log("email sending error ->" , err);
                if (err) callback(err, null);
                else callback(null, data);
            });

        }
    } catch (err) {
        callback(err, false);
    }
}

function sendEmail(from_email, to_email_list, subject, message, callback) {

    client.sendEmail({
        to:to_email_list,
        from: from_email,
        subject: {
            Data: subject,
            Charset: 'utf8'
        },
        message:{
            Data: message,
            Charset: 'utf8'
        }
    }, function(err, data, res) {
        console.log("email sending error ->" , err);
        if (err) callback(err, null);
        else callback(null, data);
    });
}

exports.sendVerificationEmail = function (req, to, name, code, callback) {
    try {

        if (config.send_mail && !offline) {
            let encodedMail = new Buffer(to).toString('base64');
            let link="http://"+req.get('host')+"/api/auth/verify?mail="+encodedMail+"&id="+code;
            var message = 'Hi' + '<h1>'+ name +'</h1> <br>'+ 'Please Click on the link to verify your email.<br><a href='+link+'>Click here to verify</a>';
            var subject = 'Please confirm your account for Pixstagram application.';
            awsSendEmail(email_config.from, to, subject, message, function (error, data) {
                callback(error, data);
            });

        } else callback(null, true);

    } catch(err) {
        callback(err, false);
    }
};

exports.sendUpdateEmailVerificationEmail = function (req, name, orgEmail, newEmail, code, callback) {
    try {

        if (config.send_mail && !offline) {
            let encodedNewEmail = new Buffer(newEmail).toString('base64');
            let encodedOrgEmail = new Buffer(orgEmail).toString('base64');

            let link="http://"+req.get('host')+"/api/auth/verifyUpdated?newEmail="+encodedNewEmail+"&orgEmail="+encodedOrgEmail+"&code="+code;
            var message = 'Hi' + '<h1>'+ name +'</h1> <br>'+ 'Please Click on the link to verify your email.<br><a href='+link+'>Click here to verify</a>';
            var subject = 'Please confirm your updated email for STLCentral application.';
            awsSendEmail(email_config.from, to, subject, message, function (error, data) {
                callback(error, data);
            });

        } else callback(null, true);

    } catch(err) {
        callback(err, false);
    }
};

exports.sendInvitationEmail = function ( fromName, to , callback) {
    try {

        if (config.send_mail) {
            var message = 'Hi, ' + ' Please download this app  : ' + '<br> '+ config.appstoreUrl + '<br>' + config.googleUrl ;
            var subject = fromName + ' invited you to enjoy the application : PRVMSG';
            awsSendEmail(email_config.from, to, subject, message, function (error, data) {
                callback(error, data);
            });

        } else callback(null, true);

    } catch(err) {
        callback(err, false);
    }
};

exports.sendNotificationEmail = function (to, name, msg, callback) {
    try {

        if (config.send_mail && !offline) {
            var message = 'Hi' + '<h1>'+ name +'</h1> <br>'+ msg;
            var subject = 'Notification from STLCentral.';
            awsSendEmail(email_config.from, to, subject, message, function (error, data) {
                callback(error, data);
            });

        } else callback(null, true);

    } catch(err) {
        callback(err, false);
    }
};