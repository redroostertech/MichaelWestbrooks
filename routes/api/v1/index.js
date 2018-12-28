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

    //console.log(req.body);
    var twiml = new main.twilio.twiml.MessagingResponse();
    var body = req.body.Body.toLowerCase();

    verify(req.body.From, function(success, user) {
        if (!success) {
            twiml.message("Welcome to Venue Management. We were not able to verify your phone number. Create your account at https://michael-westbrooks.herokuapp.com/twilio-signup\n\n\nversion 1.0");
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
            return;
        } else {
            console.log(user); 
            if (body.startsWith('menu')) { // Show menu items
                twiml.message("TEXT any of the following menu options: \n\nBOOK \nDELETE \nAVAILABLE / AVAILABILITY \nCURRENT BOOKINGS \nMY VENUE \nMY RESERVATIONS \nHOW TO\n\n\nversion 1.0");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            } else if (body.startsWith('how to')) {
                if (body.includes('book')) { //  This is a request to learn how to book
                    twiml.message("To book text BOOK SECTION with the section number and the person's name. For example, to book section 1 for Tracy Adams text the following: \n\nBOOK SECTION 1 for Tracy Adams");
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                    return
                } else if (body.includes('delete') || body.includes('edit booking')) { //  This is a request to learn how to book
                    twiml.message("To edit one of your bookings text EDIT SECTION with the section number followed by. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                    return
                } else {
                    twiml.message("Use the HOW TO command to learn how to use this system. Available commands are as follows: \n\nHOW TO BOOK");
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                    return
                }
            } else if (body === 'current bookings') { 
                main.firebase.firebase_realtime_db(function(reference) {
                    if (!reference) { 
                        twiml.message("Server request was not successful. Please try again later.");
                        res.writeHead(200, {'Content-Type': 'text/xml'});
                        res.end(twiml.toString());
                    } else {
                        retrieveFor('venues', 'venueID', user.venue, function(success, venues) {
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
                                twiml.message(text);
                                res.writeHead(200, {'Content-Type': 'text/xml'});
                                res.end(twiml.toString());
                                return
                            }
                        });
                    }
                });
                return
            } else if (body.startsWith('book')) {
                if (body.includes('section')) { // This is a request to make a booking
                    var sectionTitle = body.match(/\d+/);
                    var sectionPatron = body.substring(body.indexOf('for') + 4);
                    if (sectionTitle === null) {
                        twiml.message("You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
                        res.writeHead(200, {'Content-Type': 'text/xml'});
                        res.end(twiml.toString());
                        return
                    } else {
                        main.firebase.firebase_realtime_db(function(reference) {
                            if (!reference) { 
                                twiml.message("Server request was not successful. Please try again later.");
                                res.writeHead(200, {'Content-Type': 'text/xml'});
                                res.end(twiml.toString());
                                return;
                            } else {
                                retrieveFor('venues', 'venueID', user.venue, function(success, venues) {
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
                                                    twiml.message("You have booked section " + obj.sectionTitle + " at " + venue.venueName + " Thank you for the booking.");
                                                    res.writeHead(200, {'Content-Type': 'text/xml'});
                                                    res.end(twiml.toString());
                                                    return;
                                                }).catch(function (error) {
                                                    twiml.message("There was an error with your booking. Please try again.");
                                                    res.writeHead(200, {'Content-Type': 'text/xml'});
                                                    res.end(twiml.toString());
                                                    return;
                                                });                                                
                                            }
                                        });
                                    });
                                });
                            }
                        });
                    }
                    return;
                } else {
                    twiml.message("You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                    return
                }
            } else if (body.startsWith('delete')) { 
                if (body.includes('section')) { // This is a request to make a booking
                    var sectionTitle = body.match(/\d+/);
                    if (sectionTitle === null) {
                        twiml.message("You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
                        res.writeHead(200, {'Content-Type': 'text/xml'});
                        res.end(twiml.toString());
                        return
                    } else {
                        main.firebase.firebase_realtime_db(function(reference) {
                            if (!reference) { 
                                twiml.message("Server request was not successful. Please try again later.");
                                res.writeHead(200, {'Content-Type': 'text/xml'});
                                res.end(twiml.toString());
                            } else {
                                var deletionSuccess = false;
                                var venueName = "";
                                retrieveFor('venues', 'venueID', user.venue, function(success, venues) {
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
                                            twiml.message("You deleted your booking for section " + sectionTitle + " at " + venueName + ". Thank you for the update.");
                                            res.writeHead(200, {'Content-Type': 'text/xml'});
                                            res.end(twiml.toString());
                                            return;
                                        } else {
                                            twiml.message("You did not provide a section number for a reservation you created.\n\nText MY RESERVATIONS to see the reservations you created.");
                                            res.writeHead(200, {'Content-Type': 'text/xml'});
                                            res.end(twiml.toString());
                                            return
                                        }
                                    }
                                });
                            }
                        });
                    }
                } else {
                    twiml.message("You did not provide a section number. To view available sections, text AVAILABLE. To book, text BOOK SECTION with the section number. For example, \n\n BOOK SECTION 1 \n\n to book section 1 at the venue you are assigned to.");
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                    return
                }
            } else if (body === 'edit') { 
                twiml.message("You cannot edit a booking at this time.");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            } else if (body.includes('my')) {
                if (body.includes('reservations') || body.includes('bookings')) {
                    main.firebase.firebase_realtime_db(function(reference) {
                        if (!reference) { 
                            twiml.message("Server request was not successful. Please try again later.");
                            res.writeHead(200, {'Content-Type': 'text/xml'});
                            res.end(twiml.toString());
                            return
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
                                    twiml.message(text + "\nText MY VENUE to view the floorplan. Text AVAILABILITY to view available sections.");
                                    res.writeHead(200, {'Content-Type': 'text/xml'});
                                    res.end(twiml.toString());
                                    return;
                                }
                            });
                        }
                    });
                    return;
                } else if (body.includes('venue')) {
                    main.firebase.firebase_realtime_db(function(reference) {
                        if (!reference) { 
                            twiml.message("Server request was not successful. Please try again later.");
                            res.writeHead(200, {'Content-Type': 'text/xml'});
                            res.end(twiml.toString());
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
                                        twiml.message(text + "\nText MY VENUE to view the floorplan. Text AVAILABILITY to view available sections.");
                                        res.writeHead(200, {'Content-Type': 'text/xml'});
                                        res.end(twiml.toString());
                                        return;
                                    });
                                } else {
                                    twiml.message("There was an error. Please try again.");
                                    res.writeHead(200, {'Content-Type': 'text/xml'});
                                    res.end(twiml.toString());
                                    return;
                                }
                            });
                        }
                    });
                    return;
                } else {
                    twiml.message("You did not provide a valid command. Text MY BOOKINGS to see the bookings you made. Text MY VENUE to see what venue you are assigned to.");
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                    return
                }
            } else if (body.includes('available') || body.includes('availability')) { 
                main.firebase.firebase_realtime_db(function(reference) {
                    if (!reference) { 
                        twiml.message("Server request was not successful. Please try again later.");
                        res.writeHead(200, {'Content-Type': 'text/xml'});
                        res.end(twiml.toString());
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
                                twiml.message(text);
                                res.writeHead(200, {'Content-Type': 'text/xml'});
                                res.end(twiml.toString());
                                return
                            }
                        });
                    }
                });
                return
            } else {
                console.log("No criteria met.");
                twiml.message("Hello " + user.firstname + ". Welcome to Venue Management. To get started text MENU or text HOW TO.\n\n\nversion 1.0");
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
                return
            }
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

function retrieveFor(endpoint, orderedBy, value, callback) {
    main.firebase.firebase_realtime_db(function(reference) {
        if (!reference) { 
            return callback(false, null);
        } else {
            reference.ref('venue-management/'+endpoint).orderByChild(orderedBy).equalTo(value).once('value').then(function(snapshot) {
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