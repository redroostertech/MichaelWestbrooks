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
                processReceivedText(twil, text, from, res);
            }
        });
    }
}

var genericTextFailure = "Server request was not successful. Please try again later.";

function sentTextResponse(res, twiml, text) {
    twiml.message(text);
    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
}

function processReceivedText(twiml, text, from, res) {
    if (body.startsWith('menu')) { // Show menu items
        sendTextResponse(res, twiml, "TEXT any of the following menu options: \n\nBOOK \nDELETE \nAVAILABLE / AVAILABILITY \nCURRENT BOOKINGS \nMY VENUE \nMY RESERVATIONS \nHOW TO\n\n\nversion 1.0");
        return
    } else if (body.startsWith('how to')) {
        if (body.includes('book')) { //  This is a request to learn how to book
            sendTextResponse(res, twiml, "To book text BOOK SECTION with the section number and the person's name. For example, to book section 1 for Tracy Adams text the following: \n\nBOOK SECTION 1 for Tracy Adams");
            return
        } else if (body.includes('delete') || body.includes('edit booking')) { //  This is a request to learn how to book
            sendTextResponse(res, twiml, "To edit one of your bookings text EDIT SECTION with the section number followed by. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
            return
        } else {
            sendTextResponse(res, twiml, "Use the HOW TO command to learn how to use this system. Available commands are as follows: \n\nHOW TO BOOK \n\nHOW TO DELETE BOOKING");
            return
        }
    } else if (body === 'current bookings') {             
        retrieveFor('venues', 'venueID', user.venue, function(success, error, venues) {
            if (error) { 
                sendTextResponse(res, twiml, genericTextFailure);
                return
            } else {
                var text = 'Sections already booked include: \n\n';
                Object.keys(venues).forEach(function(venueKey) {
                    var venue = venues[venueKey];
                    var finished = _.after(parseInt(Object.keys(venue.sections).length), check);
                    Object.keys(venue.sections).forEach(function(sectionKey) {
                        var obj = venue.sections[sectionKey];
                        if (obj.available === false) {
                            text += 'Section ' + obj.sectionTitle + ' booked by ' + obj.owner.firstname + ' \n';
                        }
                        finished();
                    });
                });
                function check(){
                    sendTextResponse(res, twiml, text);
                    return
                }
            }
        });
    } else if (body.startsWith('book')) {
        if (body.includes('section')) { // This is a request to make a booking
            var sectionTitle = body.match(/\d+/);
            var sectionPatron = body.substring(body.indexOf('for') + 4);
            if (sectionTitle === null) {
                sendTextResponse(res, twiml, "You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
                return
            } else {
                retrieveFor('venues', 'venueID', user.venue, function(success, error, venues) {
                    if (error) { 
                        sendTextResponse(res, twiml, genericTextFailure);
                        return;
                    } else {
                        Object.keys(venues).forEach(function(venueKey) {
                            var venue = venues[venueKey];
                            Object.keys(venue.sections).forEach(function(sectionKey) {
                                var obj = venue.sections[sectionKey];
                                console.log("Sections \n\n ------ \n\n" + obj.sectionTitle + ' ' + obj.available);
                                console.log(sectionTitle);
                                if (obj.sectionTitle.toString() === sectionTitle.toString() && obj.available === true) {
                                    reference.ref('venue-management/venues/'+venueKey+'/sections/'+sectionKey).update({
                                        available: false,
                                        owner: user,
                                        patron: {
                                            name: sectionPatron
                                        }
                                    }).then(function(snapshot) {
                                        sendTextResponse(res, twiml, "You have booked section " + obj.sectionTitle + " at " + venue.venueName + " Thank you for the booking.");
                                        return;
                                    }).catch(function (error) {
                                        sendTextResponse(res, twiml, "There was an error with your booking. Please try again.");
                                        return;
                                    });                                                
                                }
                            });
                        });
                    }
                });
            }
            return;
        } else {
            sendTextResponse(res, twiml, "You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
            return
        }
    } else if (body.startsWith('delete')) { 
        if (body.includes('section')) { // This is a request to make a booking
            var sectionTitle = body.match(/\d+/);
            if (sectionTitle === null) {
                sendTextResponse(res, twiml, "You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
                return
            } else {
                if (error) { 
                    sendTextResponse(res, twiml, genericTextFailure);
                    return;
                } else {
                    if (error) { 
                        sendTextResponse(res, twiml, genericTextFailure);
                        return;
                    } else {
                        retrieveFor('venues', 'venueID', user.venue, function(success, error, venues) {
                            if (error) { 
                                sendTextResponse(res, twiml, genericTextFailure);
                                return;
                            } else {
                                var deletionSuccess = false;
                                var venueName = "";
                                Object.keys(venues).forEach(function(venueKey) {
                                    var venue = venues[venueKey];
                                    var finished = _.after(parseInt(Object.keys(venue.sections).length), check);
                                    Object.keys(venue.sections).forEach(function(sectionKey) {
                                        var obj = venue.sections[sectionKey];
                                        if (typeof obj.owner !== 'undefined') {
                                            if (obj.sectionTitle.toString() === sectionTitle.toString() && obj.available === false && obj.owner.phone.toString() === req.body.From.toString()) {
                                                reference.ref('venue-management/venues/'+venueKey+'/sections/'+sectionKey).update({
                                                    available: true,
                                                    owner: null,
                                                    patron: null
                                                });   
                                                deletionSuccess = true;           
                                                venueName = venue.venueName;                                  
                                            }
                                        }
                                        finished();
                                    });
                                });
                                function check(){ 
                                    if (deletionSuccess) {
                                        sendTextResponse(res, twiml, "You deleted your booking for section " + sectionTitle + " at " + venueName + ". Thank you for the update.");
                                        return;
                                    } else {
                                        sendTextResponse(res, twiml, "You did not provide a section number for a reservation you created.\n\nText MY RESERVATIONS to see the reservations you created.");
                                        return
                                    }
                                }
                            }
                        });
                    }
                }
            }
        } else {
            sendTextResponse(res, twiml, "You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
            return
        }
    } else if (body === 'edit') { 
        sendTextResponse(res, twiml, "You cannot edit a booking at this time.");
        return
    } else if (body.includes('my')) {
        if (body.includes('reservations') || body.includes('bookings')) {
            main.firebase.firebase_realtime_db(function(reference) {
                if (!reference) { 
                    sendTextResponse(res, twiml, genericTextFailure);
                    return;
                } else {
                    retrieveFor('venues', 'venueID', user.venue, function(success, venues) {
                        var text = 'My reservations include: \n\n';
                        Object.keys(venues).forEach(function(venueKey) {
                            var venue = venues[venueKey];
                            // Object.keys(venue.images).forEach(function(imageKey){
                            //     var obj = venue.images[imageKey];
                            //     text += 'View floorplan for '+ venue.venueName +' at: ' + obj + '\n\n';
                            // });
                            var finished = _.after(parseInt(Object.keys(venue.sections).length), check);
                            Object.keys(venue.sections).forEach(function(sectionKey) {
                                var obj = venue.sections[sectionKey];
                                console.log("Sections \n\n ------ \n\n" + obj.sectionTitle + ' ' + obj.available);
                                if (typeof obj.owner !== 'undefined') {
                                    console.log(obj.owner);
                                    if (obj.owner.phone === user.phone) {
                                        text += 'Section ' + obj.sectionTitle + '\n';
                                    }
                                }
                                finished();
                            });
                        });
                        function check(){
                            sendTextResponse(res, twiml, text + "\nText MY VENUE to view the floorplan. Text AVAILABILITY to view available sections.");
                            return;
                        }
                    });
                }
            });
            return;
        } else if (body.includes('venue')) {
            main.firebase.firebase_realtime_db(function(reference) {
                if (!reference) { 
                    sendTextResponse(res, twiml, genericTextFailure);
                    return;
                } else {
                    retrieveFor('venues', 'venueID', user.venue, function(success, venues) {
                        if (success ){ 
                            Object.keys(venues).forEach(function(venueKey) {
                                var venue = venues[venueKey];
                                var text = "This week you are assigned to " + venue.venueName + " in " + venue.venueCity + ". \n\n";
                                Object.keys(venue.images).forEach(function(imageKey){
                                    var obj = venue.images[imageKey];
                                    text += 'View floorplan for '+ venue.venueName +' at: ' + obj + '\n\n';
                                });
                                sendTextResponse(res, twiml, text + "\nText MY VENUE to view the floorplan. Text AVAILABILITY to view available sections.");
                                return;
                            });
                        } else {
                            sendTextResponse(res, twiml, "There was an error. Please try again.");
                            return;
                        }
                    });
                }
            });
            return;
        } else {
            sendTextResponse(res, twiml, "You did not provide a valid command. Text MY BOOKINGS to see the bookings you made. Text MY VENUE to see what venue you are assigned to.");
            return
        }
    } else if (body.includes('available') || body.includes('availability')) { 
        main.firebase.firebase_realtime_db(function(reference) {
            if (!reference) { 
                sendTextResponse(res, twiml, genericTextFailure);
                return;
            } else {
                retrieveFor('venues', 'venueID', user.venue, function(success, venues) {
                    var text = 'Available reservations include: \n\n';
                    Object.keys(venues).forEach(function(venueKey) {
                        var venue = venues[venueKey];
                        Object.keys(venue.images).forEach(function(imageKey){
                            var obj = venue.images[imageKey];
                            text += 'View floorplan for '+ venue.venueName +' at: ' + obj + '\n\n';
                        });
                        var finished = _.after(parseInt(Object.keys(venue.sections).length), check);
                        Object.keys(venue.sections).forEach(function(sectionKey) {
                            var obj = venue.sections[sectionKey];
                            if (obj.available === true) {
                                text += 'Section ' + obj.sectionTitle + '\n';
                            }
                            finished();
                        });
                    });
                    function check(){
                        sendTextResponse(res, twiml, text);
                        return
                    }
                });
            }
        });
        return
    } else {
        console.log("No criteria met.");
        sendTextResponse(res, twiml, "Hello " + user.firstname + ". Welcome to Venue Management. To get started text MENU or text HOW TO.\n\n\nversion 1.0");
        return
    }
}