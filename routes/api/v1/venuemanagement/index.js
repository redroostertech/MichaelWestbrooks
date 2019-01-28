const express                           = require('express');
const router                            = express.Router();
const main                              = require('../../../../app');
const bodyParser                        = require('body-parser');
const path                              = require('path');
const session                           = require('client-sessions');
const ok                                = require('async');
const randomstring                      = require('randomstring');
const formidable                        = require('formidable');
const _                                 = require('underscore');
const mime                              = require('mime');
const configs                           = require('../../../../configs');

//  Add projects below
const michaelwestbrooksFunctions        = require('../../../functions/michaelWestbrooksFunctions');
const twilioFunctions                   = require('../../../functions/twilioFunctions');

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
    if (req.body.password !== req.body.confirmpassword) { 
        return michaelwestbrooksFunctions.handleError(200, "Passwords do not match.", res);
    }
    twilioFunctions.signup(data, res);
});

router.post('/signin', function(req, res) {
    console.log(req.body);
    twilioFunctions.signin(req, res);
});

router.post('/sendText', function(req,res){
    console.log(req.body);
    twilioFunctions.sendText(req.body.recipient, req.body.message, res);
});

router.post('/receivedText', function(req, res) {
    var twiml = new main.twilio.twiml.MessagingResponse();
    var body = req.body.Body.toLowerCase();
    twilioFunctions.receivedText(twiml, body, req.body.From, res);
});

router.post('/createVenue', function(req, res) {
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
                    sectionTitle: fields['section'+(i+1)],
                    available: true,
                    reservedBy: ''
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
                        imageData[randomstring.generate(25)] = twilioFunctions.createPublicFileURL(uploadTo); 
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

router.get('/getVenues', function(req, res) {
    twilioFunctions.getVenues();
})

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

module.exports = router;