const express       = require('express');
const router        = express.Router();
const main          = require('../../app.js');
const bodyParser    = require('body-parser');
const path          = require('path');
const session       = require('client-sessions');
const ok            = require('async');
const randomstring  = require('randomstring');
const formidable    = require('formidable');
const _             = require('underscore');


router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json());

// var screenIds = ["SplashPage", "LoginSignUpPage", "MenuStylePage", "EcommercePage", "BookingPage", "EventPage","NewsFeedPage"]

//  MARK:- Manage endpoints
router.get('/', function(req, res) {
    res.status(200).render('main/index');
});

router.get('/twilio', function(req, res) {
    res.status(200).render('main/twilio');
}); 

router.post('/api/v1/contactform', function(req, res) {
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

router.get('/api/v1/getApp.json', function(req,res) {
    res.sendFile(path.join(main.basePathRoutes, '/api/v1/app.json'));
});

router.get('/api/v1/getPages.json', function(req,res) {
    res.sendFile(path.join(main.basePathRoutes, '/api/v1/pagesconfiguration.json'));
});

router.get('/api/v1/getApp.json', function(req, res) {
    res.sendFile(path.join(main.basePathRoutes, '/api/v1/mvpguruconfig.json'));
});

router.post('/api/v1/createApp', function(req, res) {

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

function show404Page(res) {
    res.status(200).render('404');
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

function sendMessageFromContactForm(reference, id, data, callback) {
    reference.ref('contactForm/' + id).set(data).then(function() {
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