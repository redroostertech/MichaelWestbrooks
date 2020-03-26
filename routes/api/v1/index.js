const express                           = require('express');
const router                            = express.Router();
const main                              = require('../../../app');
const bodyParser                        = require('body-parser');
const path                              = require('path');
const session                           = require('client-sessions');
const ok                                = require('async');
const randomstring                      = require('randomstring');
const formidable                        = require('formidable');
const _                                 = require('underscore');
const mime                              = require('mime');
const configs                           = require('../../../configs');

//  Add projects below
const michaelwestbrooksFunctions        = require('../../functions/michaelWestbrooksFunctions.js');
const twilioFunctions                   = require('../../functions/twilioFunctions.js');

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
            return michaelwestbrooksFunctions.handleError(200, "No reference availale", res);
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
                michaelwestbrooksFunctions.handleError(errorCode, errorMessage, res);
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
    michaelwestbrooksFunctions.addAppInfo(data.appId, data, res)
});

router.get('/getApp.json', function(req,res) {
    res.sendFile(path.join(configs.basePathRoutes, '/api/v1/test-data/json/app.json'));
});

router.get('/getPages.json', function(req,res) {
    res.sendFile(path.join(configs.basePathRoutes, '/api/v1/test-data/json/pagesconfiguration.json'));
});

router.get('/getApp.json', function(req, res) {
    res.sendFile(path.join(configs.basePathRoutes, '/api/v1/test-data/json/mvpguruconfig.json'));
});

var venuemanagementController = require(path.join(configs.basePathRoutes, '/api/v1/venuemanagement/index.js'));
router.use('/venuemanagement', venuemanagementController);

var preppedUpController = require(path.join(configs.basePathRoutes, '/api/v1/preppedUp/index.js'));
router.use('/preppedUp', preppedUpController);

// var appBuilderController = require(path.join(configs.basePathRoutes, '/api/v1/appBuilder/index.js'));
// router.use('/appBuilder', preppedUpController);

module.exports = router;