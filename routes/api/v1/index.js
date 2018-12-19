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

router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json());

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

router.post('/sendText', function(req,res){
    console.log(req.body);
    main.twilio.messages.create({
        body: req.body.message,
        to: req.body.recipient,
        from: '+19292035343'
    })
    .then((message) => validateResponse(message, res));
    
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

module.exports = router;