const express       = require('express');
const main          = require('../../app.js');

var genericError = { "errorCode": 200, "errorMessage": "Something went wrong." };
var genericEmptyError = { "errorCode" : null, "errorMessage" : null };
var genericSuccess = { "result" : true, "message" : "Request was successful" };
var genericFailure = { "result" : false, "message" : "Request was unsuccessful" };

function validateTwilioResponse (message, res) {
    console.log(message);
    if (message.sid === null) {
        handleError(200, "There was an error sending text.", res);
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

function handleError (code, errorMessage, res) {
    res.status(code).json({
        "status": code,
        "success": {
            "result": false,
            "message": null
        },
        "data": null,
        "error": {
            "code": code,
            "message": errorMessage
        }
    });
}

function handleResponse (code, message, data) {
    return {
        "status": 200,
        "success": {
            "result": true,
            "message": message,
            "data": data,
        },
        "data": null,
        "error": {
            "code": null,
            "message":null,
        }
    }
}

function retrieve (node, endpoint, callback) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return callback(genericFailure, genericError , null);
        } else {
            reference.ref(node + '/' + endpoint + '/').once('value').then(function(snapshot) {
                if (snapshot.val() === null) {
                    return callback(genericFailure, genericError , null);
                } else {
                    var data = snapshot.val();
                    return callback(genericSuccess, null, data);
                }
            }).catch(function (error) {
                return callback(genericFailure, error, null);
            });
        }
    });
}

function retrieveWith (node, key, endpoint, callback) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return callback(genericFailure, genericError , null);
        } else {
            reference.ref(node + '/' + endpoint).child(key).once('value').then(function(snapshot) {
                if (snapshot.val() === null) {
                    return callback(genericFailure, genericError , null);
                } else {
                    var data = snapshot.val();
                    return callback(genericSuccess, null, data);
                }
            }).catch(function (error) {
                return callback(genericFailure, error, null);
            });
        }
    });
}

function retrieveFor (node, endpoint, orderedBy, value, callback) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return callback(genericFailure, genericError , null);
        } else {
            reference.ref(node + '/' + endpoint).orderByChild(orderedBy).equalTo(value).once('value').then(function(snapshot) {
                if (snapshot.val() === null) {
                    return callback(genericFailure, genericError , null);
                } else {
                    const data = snapshot.val() || null;
                    if (data) {
                        return callback(genericSuccess, null, data);
                    }
                    return callback(genericFailure, null, data);
                }
            }).catch(function (error) {
                return callback(genericFailure, error, null);
            });
        }
    });
}

function loadViewVenueById(code, success, venue, error, res) {
    loadView("main/twilio-view-venue", code, success, venue, error, res);
}

function loadViewEditVenueById(code, success, venue, error, res) {
    loadView("main/twilio-edit-venue", code, success, venue, error, res);
}

function loadViewSections(code, success, venue, error, res) {
    loadView("main/twilio-view-sections", code, success, venue, error, res);
}

function loadViewVenues(code, success, venues, error, res) {
    loadView("main/twilio-view-venues", code, success, venues, error, res);
}

function loadViewUsers(code, success, users, error, res) {
    loadView("main/twilio-view-users", code, success, users, error, res);
}

function loadView(name, success, data, error, res) {
    res.status(code).render(name, {
        "status": code,
        "success": success,
        "data": data,
        "error": error
    });
}


function receivedText(twiml, text, from, res) {
    retrieveFor('venue-management', 'users', 'phone', from, function(success, error, data) {
        if (!success) {
            twiml.message("Welcome to Venue Management. We were not able to verify your phone number. Create your account at https://michael-westbrooks.herokuapp.com/twilio-signup\n\n\nversion 1.0");
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
            return;
        } else {

        }
    });
}

module.exports = {

    signup: function(data, res) {
        main.firebase.firebase_auth(function(auth) {
            auth.createUserWithEmailAndPassword(data.emailaddress, data.confirmpassword).then(function () {
                auth.onAuthStateChanged(function (user) {
                    if (user) {
                        main.firebase.firebase_realtime_db(function(reference) {
                            if (!reference) { 
                                handleError(200, "No reference available", res);
                            } else {
                                reference.ref('venue-management/phonenumbers/').orderByChild("number").equalTo('+' + data.phone).once('value').then(function(snapshot) {
                                    if (snapshot.val() !== null) {
                                        return handleError(200, "Phone number already exists. Please use another email/phone combo.", res);
                                    }
                                    var userRef = reference.ref('venue-management/users');
                                    var newUserRef = userRef.push();
                                    newUserRef.set(data).then(function(ref) {
                                        var phoneRef = reference.ref('venue-management/phonenumbers');
                                        var newPhoneRef = phoneRef.push();
                                        newPhoneRef.set({ 'number': data.phone }).then(function(ref) {
                                            main.twilioClient.messages.create({
                                                body: "Thank you for joining venue management.",
                                                to: data.phone,
                                                from: '+19292035343'
                                            })
                                            .then((message) => validateTwilioResponse(message, res))
                                            .catch(error => handleError(200, error, res));
                                        }).catch(function (error) {
                                            var errorCode = error.code;
                                            var errorMessage = error.message;
                                            handleError(errorCode, errorMessage, res);
                                        });
                                    }).catch(function (error) {
                                        var errorCode = error.code;
                                        var errorMessage = error.message;
                                        handleError(errorCode, errorMessage, res);
                                    });
                                });
                            }
                        });
                    } else {
                        handleError(errorCode, "Something went wrong. Please try again.", res);
                    }
                });
            }).catch(function (error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                handleError(errorCode, errorMessage, res);
            })
        });
    },

    createPublicFileURL: function (storageName) {
        return `http://storage.googleapis.com/${main.configs.firebaseStorageBucket}/${encodeURIComponent(storageName)}`;
    }, 

    //  Generic page transitions
    loadVenueUpload: function(res) {
        loadView("main/twilio-upload", 200, genericSuccess, null, genericEmptyError, res);
    },

    //  Visible API functions
    getVenues: function(req, res) {
        retrieve('venue-management', 'venues', function(success, error, data) {
            var venues = data;
            loadViewVenues(200, success, venues, error, res);
        });
    },

    getUsers: function(req, res) {
        retrieve('venue-management', 'users', function(success, error, data) {
            var users = data;
            loadViewUsers(200, success, users, error, res);
        });
    },

    getVenueWithId: function(id, res) {
        retrieveWith('venue-management', id, 'venues', function(success, error, data) {
            var venue;
            if (!data) { 
                venue = data;
                venue.key = id;
            }
            loadViewVenueById(200, success, venue, error, res);
        });
    },

    editVenueWithId: function(id, res) {
        retrieveWith('venue-management', id, 'venues', function(success, error, data) {
            var venue;
            if (!data) { 
                venue = data;
                venue.key = id;
            }
            loadViewEditVenueById(200, success, venue, error, res);
        });
    },

    getSectionsAtVenueWithId: function(id, res) {
        retrieveWith('venue-management', id, 'venues', function(success, error, data) {
            var venue;
            if (!data) { 
                venue = data;
                venue.key = id;
            }
            loadViewSections(200, success, venue, error, res);
        });
    },

    sendText: function(to, body, res) {
        main.twilioClient.messages.create({
            body: body,
            to: to,
            from: '+19292035343'
        })
        .then((message) => validateTwilioResponse(message, res))
        .catch(error => handleError(error, res));
    },

    receivedText: function(twiml, text, from, res) {
        retrieveFor('venue-management', 'users', 'phone', from, function(success, error, data) {
            if (!success) {
                twiml.message("Welcome to Venue Management. We were not able to verify your phone number. Create your account at https://michael-westbrooks.herokuapp.com/twilio-signup\n\n\nversion 1.0");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return;
            } else {
                twiml.message("Welcome to Venue Management. We were not able to verify your phone number. Create your account at https://michael-westbrooks.herokuapp.com/twilio-signup\n\n\nversion 1.0");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return;
            }
        });
    }
}