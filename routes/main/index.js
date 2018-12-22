const express       = require('express');
const router        = express.Router();
const main          = require('../../app.js');
const bodyParser    = require('body-parser');
const dynamicAddresses  = require('country-state-city');
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

router.get('/admin', function(req, res) {
    res.status(200).render('main/admin-signin');
});

router.get('/twilio', function(req, res) {
    res.status(200).render('main/twilio');
}); 

router.get('/twilio-signup', function(req, res) {
    retrieve('venues', function(success, venues) {
        if (!success) {
            res.status(200).render('main/twilio-signup', {
                "status": 200,
                "success": {
                    "result": false,
                    "message": null
                },
                "data": venues,
                "error": {
                    "code": 200,
                    "message": "No venues available.",
                }
            });
        } else {
            res.status(200).render('main/twilio-signup', {
                "status": 200,
                "success": {
                    "result": true,
                    "message": "Requst was successful"
                },
                "data": venues,
                "error": {
                    "code": null,
                    "message":null,
                }
            });
        }
    });
});

router.get('/twilio-view-venues', function(req, res) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            res.status(200).render('main/twilio-view-venues', {
                "status": 200,
                "success": {
                    "result": true,
                    "message": "Requst was successful"
                },
                "data": null,
                "error": {
                    "code": null,
                    "message":null,
                }
            });
        } else {
            retrieve('venues', function(success, venues) {
                res.status(200).render('main/twilio-view-venues', {
                    "status": 200,
                    "success": {
                        "result": true,
                        "message": "Requst was successful"
                    },
                    "data": venues,
                    "error": {
                        "code": null,
                        "message":null,
                    }
                });
            });
        }
    });
});

router.get('/twilio-view-users', function(req, res) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            res.status(200).render('main/twilio-view-users', {
                "status": 200,
                "success": {
                    "result": true,
                    "message": "Requst was successful"
                },
                "data": null,
                "error": {
                    "code": null,
                    "message":null,
                }
            });
        } else {
            retrieve('users', function(success, users) {
                res.status(200).render('main/twilio-view-users', {
                    "status": 200,
                    "success": {
                        "result": true,
                        "message": "Requst was successful"
                    },
                    "data": users,
                    "error": {
                        "code": null,
                        "message":null,
                    }
                });
            });
        }
    });
});

router.get('/twilio-upload-venue', function(req, res) {
    res.status(200).render('main/twilio-upload', {
        "status": 200,
        "success": {
            "result": true,
            "message": "Requst was successful"
        },
        "data": null,
        "error": {
            "code": null,
            "message":null,
        }
    });
});

router.get('/twilio-view-venue', function(req, res) {
    console.log(req.query);
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            res.status(200).render('main/twilio-view-venue', {
                "status": 200,
                "success": {
                    "result": true,
                    "message": "Requst was successful"
                },
                "data": null,
                "error": {
                    "code": null,
                    "message":null,
                }
            });
        } else {
            retrieveWith(req.query.id, 'venues', function(success, venues) {
                venues.key = req.query.id;
                res.status(200).render('main/twilio-view-venue', {
                    "status": 200,
                    "success": {
                        "result": true,
                        "message": "Requst was successful"
                    },
                    "data": venues,
                    "error": {
                        "code": null,
                        "message":null,
                    }
                });
            });
        }
    });
});

router.get('/twilio-edit-venue', function(req, res) {
    console.log(req.query);
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            res.status(200).render('main/twilio-edit-venue', {
                "status": 200,
                "success": {
                    "result": true,
                    "message": "Requst was successful"
                },
                "data": null,
                "error": {
                    "code": null,
                    "message":null,
                }
            });
        } else {
            retrieveWith(req.query.id, 'venues', function(success, venues) {
                res.status(200).render('main/twilio-edit-venue', {
                    "status": 200,
                    "success": {
                        "result": true,
                        "message": "Requst was successful"
                    },
                    "data": venues,
                    "error": {
                        "code": null,
                        "message":null,
                    }
                });
            });
        }
    });
});

function retrieve(endpoint, callback) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return callback(false, null);
        } else {
            reference.ref('venue-management/'+endpoint+'/').once('value').then(function(snapshot) {
                if (snapshot.val() === null) {
                    return callback(false, null);
                } else {
                    const data = snapshot.val() || null;
                    if (data) {
                        return callback(true, data);
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

function retrieveWith(key, endpoint, callback) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return callback(false, null);
        } else {
            reference.ref('venue-management/'+endpoint).child(key).once('value').then(function(snapshot) {
                if (snapshot.val() === null) {
                    return callback(false, null);
                } else {
                    const data = snapshot.val() || null;
                    if (data) {
                        return callback(true, data);
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

module.exports = router;