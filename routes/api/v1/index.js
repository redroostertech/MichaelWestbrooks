const express       = require('express');
const router        = express.Router();
const main          = require('../../../app.js');
const bodyParser    = require('body-parser');
const path          = require('path');
const session       = require('client-sessions');
const ok            = require('async');
const randomstring  = require('randomstring');
const formidable    = require('formidable');
const _             = require('underscore');
const mime          = require('mime');
const configs       = require('../../../configs');

router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json());
router.use(session({
    cookieName: 'session',
    secret: configs.cookieSecret,
    duration: 60 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
}));

router.post('/contactform', function(req, res) {
    console.log(req.body);
    var data = {
        name: req.body.name,
        email: req.body.email,
        message: req.body.message,
        _createdAt: new Date()
    };

    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return console.log("No reference availale"); 
        } else {
            var contactRef = reference.ref('contactForm');
            var newContactRef = contactRef.push();
            newContactRef.set(data).then(function() {
                res.status(200).json({
                    "status": 200,
                    "success": {
                        "result": true,
                        "message": "Thank you for sending me a message. I will get back to you shortly."
                    },
                    "data": null,
                    "error": {
                        "code": null,
                        "message": null
                    }
                });
            }).catch(function (error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                res.status(200).json({
                    "status": 200,
                    "success": {
                        "result": false,
                        "message": null
                    },
                    "data": null,
                    "error": {
                        "code": errorCode,
                        "message": errorMessage
                    }
                });
            });
        }
    });
});

router.post('/signup', function(req, res) {
    console.log(req.body);
    var data = {
        phone: '+' + req.body.countrycode + req.body.phonenumber,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.emailaddress,
        venue: req.body.venue,
        _createdAt: new Date(),
    };
    if (req.body.password !== req.body.confirmpassword) { return false }
    main.firebase.firebase_auth(function(auth) {
        auth.createUserWithEmailAndPassword(req.body.emailaddress, req.body.confirmpassword).then(function () {

            auth.onAuthStateChanged(function (user) {
                if (user) {

                    main.firebase.firebase_realtime_db(function(reference) {
                        if (!reference) { 
                            res.status(200).json({
                                "status": 200,
                                "success": {
                                    "result": false,
                                    "message": null
                                },
                                "data": null,
                                "error": {
                                    "code": 200,
                                    "message": "No reference availale",
                                }
                            });
                        } else {
                            reference.ref('venue-management/phonenumbers/').orderByChild("number").equalTo('+' + req.body.countrycode + req.body.phonenumber).once('value').then(function(snapshot) {

                                if (snapshot.val() !== null) {
                                    return res.status(200).json({
                                        "status": 200,
                                        "success": {
                                            "result": false,
                                            "message": null
                                        },
                                        "data": null,
                                        "error": {
                                            "code": 200,
                                            "message": "Phone number already exists. Please use another email/phone combo."
                                        }
                                    });
                                }

                                var userRef = reference.ref('venue-management/users');
                                var newUserRef = userRef.push();
                                newUserRef.set(data).then(function(ref) {
                                    var phoneRef = reference.ref('venue-management/phonenumbers');
                                    var newPhoneRef = phoneRef.push();
                                    newPhoneRef.set({ 'number': '+' + req.body.countrycode + req.body.phonenumber }).then(function(ref) {
                                        
                                        main.twilioClient.messages.create({
                                            body: "Thank you for joining venue management.",
                                            to: '+' + req.body.countrycode + req.body.phonenumber,
                                            from: '+19292035343'
                                        })
                                        .then((message) => validateResponse(message, res))
                                        .catch(error => handleError(error, res));

                                        res.status(200).json({
                                            "status": 200,
                                            "success": {
                                                "result": true,
                                                "message": "Thank you for sending me a message. I will get back to you shortly."
                                            },
                                            "data": null,
                                            "error": {
                                                "code": null,
                                                "message": null
                                            }
                                        });
                                    }).catch(function (error) {
                                        var errorCode = error.code;
                                        var errorMessage = error.message;
                                        res.status(200).json({
                                            "status": 200,
                                            "success": {
                                                "result": false,
                                                "message": null
                                            },
                                            "data": null,
                                            "error": {
                                                "code": errorCode,
                                                "message": errorMessage
                                            }
                                        });
                                    });
                                }).catch(function (error) {
                                    var errorCode = error.code;
                                    var errorMessage = error.message;
                                    res.status(200).json({
                                        "status": 200,
                                        "success": {
                                            "result": false,
                                            "message": null
                                        },
                                        "data": null,
                                        "error": {
                                            "code": errorCode,
                                            "message": errorMessage
                                        }
                                    });
                                });
                            });
                        }
                    });
                    
                } else {
                    res.status(200).json({
                        "status": 200,
                        "success": {
                            "result": false,
                            "message": null
                        },
                        "data": null,
                        "error": {
                            "code": 200,
                            "message": "Something went wrong. Please try again."
                        }
                    });
                }
            });
        }).catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            res.status(200).json({
                "status": 200,
                "success": {
                    "result": false,
                    "message": null
                },
                "data": null,
                "error": {
                    "code": errorCode,
                    "message": errorMessage
                }
            });
        })
    });
});

router.post('/signin', function(req, res) {
    console.log(req.body);
    main.firebase.firebase_auth(function(auth) {
        auth.signInWithEmailAndPassword(req.body.emailaddress, req.body.password)
        .then(function () {

            //  Login successful.
            auth.onAuthStateChanged(function (user) {
                if (user) {
                    
                    main.firebase.firebase_realtime_db(function(reference) {
                        if (!reference) { 
                            res.redirect('../admin');
                        } else {
                            reference.ref('users/').orderByChild("uid").equalTo(user.uid).once('value').then(function(snapshot) {
                                if (snapshot.val() !== null) {
                                    req.session._id = user.uid;
                                    req.session.user = user;
                                    res.redirect('../../twilio-view-venues');
                                }
                            });
                        }
                    });
                } else {
                    res.redirect('../admin');
                }
            });
        }).catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            res.redirect('../admin');
        });
    });
});

router.post('/sendText', function(req,res){
    console.log(req.body);
    main.twilioClient.messages.create({
        body: req.body.message,
        to: req.body.recipient,
        from: '+19292035343'
    })
    .then((message) => validateResponse(message, res))
    .catch(error => handleError(error, res));
});

router.post('/receivedText', function(req, res) {
    console.log(req.body);
    verify(req.body.From, function(success, object) {
        if (!success) {
            var twiml = new main.twilio.twiml.MessagingResponse();
            twiml.message("Welcome to Venue Management. We were not able to verify your phone number. Create your account at https://michael-westbrooks.herokuapp.com/twilio-signup.");
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        } else {

            console.log(object); 

            if (req.body.Body.toLowerCase() === 'menu') { 
                var twiml = new main.twilio.twiml.MessagingResponse();
                twiml.message("TEXT any of the following menu options: BOOK, EDIT, AVAILABLE");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            }

            if (req.body.Body.toLowerCase() === 'help') { 
                var twiml = new main.twilio.twiml.MessagingResponse();
                twiml.message("TEXT any of the following menu options: BOOK, EDIT, AVAILABLE");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            }

            if (req.body.Body.toLowerCase() === 'BOOK') { 
                var twiml = new main.twilio.twiml.MessagingResponse();
                twiml.message("Available reservations include: ");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            }

            if (req.body.Body.toLowerCase() === 'EDIT') { 
                var twiml = new main.twilio.twiml.MessagingResponse();
                twiml.message("Available reservations include: ");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            }

            if (req.body.Body.toLowerCase() === 'AVAILABLE') { 
                var twiml = new main.twilio.twiml.MessagingResponse();
                twiml.message("Available reservations include: ");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            }

            var twiml = new main.twilio.twiml.MessagingResponse();
            twiml.message("Hello " + object.firstname + ". Welcome to Venue Management. To get started text MENU or text HELP.");
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
            return
        }
    })
});

router.post('/createvenue', function(req, res) {
    var form = new formidable.IncomingForm();
    var data = {};
    var imageData = {};
    var sectionData = {};


    form.parse(req, function (err, fields, files) {
        if (!err) {

            console.log(fields);

            data.venueName = fields.venuename;
            data.venueCity = fields.venuecity;
            data.venueState = fields.venuestate;
            data.venueCountry = fields.venuecountry;
            data.active = fields.active;
            data.venueID = randomstring.generate(25);
            data._createdAt = new Date();

            var finished = _.after(parseInt(fields.floors), check);

            for (i = 0; i < parseInt(fields.sections); i++){
                sectionData['section'+(i+1)] = {
                    sectionID: randomstring.generate(25),
                    sectionTitle: fields['section'+(i+1)]
                };  
            }

            main.firebase.firebase_storage(function(firebase) {
                for (i = 0; i < parseInt(fields.floors); i++) {
                    var theFile = files['venueImage'+(i+1)];
                    var fileMime = mime.getType(theFile.name);
                    var fileExt = mime.getExtension(theFile.type);
                    var uploadTo = 'images/' + data.venueID + '/' + 'venueImage'+(i+1) + '.' + fileExt;

                    firebase.upload(theFile.path, { 
                        destination: uploadTo,
                        public: true,
                        metadata: {
                            contentType: fileMime,
                            cacheControl: "public, max-age=300"
                        }
                    }, function(err, file) {
                        if (err) { return console.log('Error uploading file: ' + err); }
                        imageData[randomstring.generate(25)] = createPublicFileURL(uploadTo); 
                        finished();
                    });
                }
            });

            function check(){
                data.images = imageData;
                data.sections = sectionData;
                main.firebase.firebase_realtime_db(function(reference) {
                    if (!reference) { 
                        res.status(200).json({
                            "status": 200,
                            "success": {
                                "result": false,
                                "message": null
                            },
                            "data": null,
                            "error": {
                                "code": 200,
                                "message": "No reference availale",
                            }
                        });
                    } else {
                        var venueRef = reference.ref('venue-management/venues');
                        var newVenueRef = venueRef.push();
                        newVenueRef.set(data).then(function(ref) {
                            res.redirect('../main/twilio-view-venues');
                            // res.status(200).json({
                            //     "status": 200,
                            //     "success": {
                            //         "result": true,
                            //         "message": "Thank you for sending me a message. I will get back to you shortly."
                            //     },
                            //     "data": null,
                            //     "error": {
                            //         "code": null,
                            //         "message": null
                            //     }
                            // });
                        }).catch(function (error) {
                            var errorCode = error.code;
                            var errorMessage = error.message;
                            res.status(200).json({
                                "status": 200,
                                "success": {
                                    "result": false,
                                    "message": null
                                },
                                "data": null,
                                "error": {
                                    "code": errorCode,
                                    "message": errorMessage
                                }
                            });
                        });
                    }
                });
            }
        }
    });
});

router.get('/deletevenue/:id', function(req, res) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            res.status(200).json({
                "status": 200,
                "success": {
                    "result": false,
                    "message": null
                },
                "data": null,
                "error": {
                    "code": 200,
                    "message": "No reference availale",
                }
            });
        } else {
            reference.ref('venue-management/venues/'+req.params.id).remove().then(function(snapshot) {
                console.log('Removed');
                //res.redirect('/main/superadmin/venuemanagement'); 
            }, function(errorObject) {
                console.log("The read failed: " + errorObject.code);
                //res.redirect('/main/superadmin/venuemanagement'); 
            });
        }
    });
});

router.post('/createApp', function(req, res) {

    var reqData = req.body.data;
    var reqDataScreen = (req.body.data.screen != undefined) ? req.body.data.screen:null;

    var data = {
        _createdAt: new Date(),
        theme: {
            secondaryColor: reqData.secondaryColor,
            primaryColor: reqData.primaryColor
        },
        description: reqData.description,
        owner_id: reqData.owner_id,
        category: reqData.category,
        appId: reqData.appId,
        name: reqData.name,
        screen: reqDataScreen
    }

    console.log(data);

    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return console.log("No reference availale"); 
        } else {

            //  App Info
            reference.ref('apps/' + data.appId).once('value').then(function(snapshot) {
                
                // console.log('Edit data');
                // console.log(snapshot.val());
                // console.log(data.appId);

                addAppInfo(reference, data.appId, data, function(response) {
                    res.json(response);
                });

            });
        }
    });

});

router.get('/getApp.json', function(req,res) {
    res.sendFile(path.join(main.basePathRoutes, '/api/v1/app.json'));
});

router.get('/getPages.json', function(req,res) {
    res.sendFile(path.join(main.basePathRoutes, '/api/v1/pagesconfiguration.json'));
});

router.get('/getApp.json', function(req, res) {
    res.sendFile(path.join(main.basePathRoutes, '/api/v1/mvpguruconfig.json'));
});

function validateResponse(message, res) {
    console.log(message)
    if (message.sid === null) {
        res.status(200).json({
            "status": 200,
            "success": {
                "result": false,
                "message": null
            },
            "data": null,
            "error": {
                "code": 200,
                "message": "There was an error sending text."
            }
        });
    } else {
        res.status(200).json({
            "status": 200,
            "success": {
                "result": true,
                "message": "You successfully sent a text via twilio."
            },
            "data": null,
            "error": {
                "code": null,
                "message": null
            }
        });
    }
}

function handleError(error, res){
    res.status(200).json({
        "status": 200,
        "success": {
            "result": false,
            "message": null
        },
        "data": null,
        "error": {
            "code": 200,
            "message": "There was an error sending text.",
            "data": error
        }
    });
}

function verify(phoneNumber, callback) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return callback(false);
        } else {
            reference.ref('venue-management/users/').orderByChild("phone").equalTo(phoneNumber).once('value').then(function(snapshot) {
                if (snapshot.val() === null) {
                    return callback(false, null);
                } else {
                    const data = snapshot.val() || null;
                    if (data) {
                        const id = Object.keys(data)[0];
                        return callback(true, data[id]);
                    }
                    return callback(false, null);
                }
            }).catch(function (error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorMessage);
                return callback(false, null);
            });
        }
    });
}

function createPublicFileURL(storageName) {
    return `http://storage.googleapis.com/${main.configs.firebaseStorageBucket}/${encodeURIComponent(storageName)}`;
}

function addAppInfo(reference, id, data, callback) {
    reference.ref('apps/' + id).set(data).then(function() {
        callback({
            "data": {
                "code": 200,
                "message": "Successfully add data"
            },
            "error": null
        });
    }).catch(function (error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        callback({
            "data": null,
            "error": {
                "code": errorCode,
                "message": errorMessage
            }
        });
    });
}

module.exports = router;

//  Sample Webhook request from Twilio
/*{ 
    ToCountry: 'US',
    ToState: 'NY',
    SmsMessageSid: 'SM7f15deffbf9b8f04f5bf8298a98af1a3',
    NumMedia: '0',
    ToCity: 'NEW YORK CITY',
    FromZip: '08899',
    SmsSid: 'SM7f15deffbf9b8f04f5bf8298a98af1a3',
    FromState: 'NJ',
    SmsStatus: 'received',
    FromCity: 'METUCHEN',
    Body: 'Here\'s another response',
    FromCountry: 'US',
    To: '+19292035343',
    ToZip: '',
    NumSegments: '1',
    MessageSid: 'SM7f15deffbf9b8f04f5bf8298a98af1a3',
    AccountSid: 'AC6a5aa06f9e8e365500e6e3b51fa86a5b',
    From: '+19082178274',
    ApiVersion: '2010-04-01' 
}*/