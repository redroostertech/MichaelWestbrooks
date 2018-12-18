'use strict';

//  Declare require variables
var _ = require('underscore');
//  var Async = require('async');
//var aws = require('aws-sdk');
var bodyParser = require('body-parser');
//var dateformat = require('date-format');
var session = require('client-sessions');
var express = require('express');
var app = express();
var router = express.Router();
var firebase = require('firebase');
var firebaseadmin = require('firebase-admin');
var formidable = require('formidable');
var multer = require('multer');
var randomstring = require('randomstring');
//var uuid = require('node-uuid');

//  Declare constants
const app_configuration = require('./configs');
const port = process.env.PORT || app_configuration.app_port;

//  Setup express app
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public/views');
//app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(bodyParser.json());
//  a 1 week voting session
app.use(session({
    cookieName: 'session',
    secret: app_configuration.sessions.app_cookie_secret,
    duration: 1 * 24 * 60 * 60 * 1000 //  7 * 24 * 60 * 60 * 1000,
}));
app.use(function (request, response, next) {
    if (!isCustomer) {
        response.redirect('/error');
        next();
    }
    next();
});
app.use(function (request, response, next) {
    if (request.session && request.session.user) {
        console.log("Cookie already created.");
        console.log(request.session.user);
        siteData["uid"] = request.session.user;
    } else {
        var id = randomstring.generate(25);
        request.session.user = id;
        siteData["uid"] = request.session.user;
    }
    next();
});
//  app.use('/api', router);

//  Start Firebase Configuration
var firebase_configuration = {
    apiKey: app_configuration.firebase.firebase_api_key,
    authDomain: app_configuration.firebase.firebase_auth_domain,
    databaseURL: app_configuration.firebase.firebase_database_url,
    projectId: app_configuration.firebase.firebase_project_id,
    storageBucket: app_configuration.firebase.firebase_storage_bucket,
    messagingSenderId: app_configuration.firebase.firebase_messagingesender_id
};
var firObj = firebase.initializeApp(firebase_configuration);

//  Setup AWS S3 Client
//aws.config.update({
//    region: app_configuration.aws.aws_region
//})
//var aws_s3 = new aws.S3({
//    accessKeyId: app_configuration.aws.aws_access_key_id,
//    secretAccessKey: app_configuration.aws.aws_secret_access_key,
//    Bucket: app_configuration.aws.aws_buckets_name,
//});

//  Setup Routes

/// GENERAL USERS
//  1. Landing Page
app.get('/', function (request, response) {
    //console.log(siteData);
    response.status(200).render('index', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

app.get('/error', function (request, response) {
    response.status(200).render('404', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

//  2. About Us
app.get('/about_us', function (request, response) {
    response.status(200).render('about-us', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

//  3. Awards - Nominees
app.get('/awards/nominees', function (request, response) {
    response.status(200).render('nominees', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData,
        nomineeImages: nomineeImages
    });
});

//  4. Awards - Lifetime Achievement Award
app.get('/awards/lifetimeaward', function (request, response) {
    response.status(200).render('lifetimeaward', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: {
            "login-success": true,
            "status_message": "Sign into your Gumbo account.",
            "google_maps_api_key": "AIzaSyCjCVkU7YnGfown4_i_sm6X36HP2jWTv54"
        }
    });
});

//  5. Awards - Awards Process
app.get('/awards/awardsprocess', function (request, response) {
    response.status(200).render('awardsprocess', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: {
            "login-success": true,
            "status_message": "Sign into your Gumbo account.",
            "google_maps_api_key": "AIzaSyCjCVkU7YnGfown4_i_sm6X36HP2jWTv54"
        }
    });
});

//  6. Awards - Voting Process
app.get('/awards/votingprocess', function (request, response) {
    response.status(200).render('votingprocess', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: {
            "login-success": true,
            "status_message": "Sign into your Gumbo account.",
            "google_maps_api_key": "AIzaSyCjCVkU7YnGfown4_i_sm6X36HP2jWTv54"
        }
    });
});

//  7. Performers
app.get('/performers', function (request, response) {
    response.status(200).render('performers', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

//  8. Sponsors - View Sponsors
app.get('/sponsors', function (request, response) {
    console.log(siteData.site_sponsors);
    response.status(200).render('sponsors', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

//  9. Sponsors - Become a Sponser
app.get('/sponsors/become', function (request, response) {
    response.status(200).render('contact-us', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

//  10. Become a Sponsor - Contact Us
app.get('/sponsors/contact_us', function (request, response) {
    response.status(200).render('contact-us', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

//  BONUS - VOTING SYSTEM
app.get('/nominee/vote', function (request, response) {
    console.log("My user Cookie " + siteData.uid);
    console.log("Nominee ID " + request.query.id);
    console.log("Nominee Category " + request.query.category);
    var id = randomstring.generate(25);
    var vote_id = app_configuration.app_customer_id + request.query.category + request.query.id + siteData.uid
    var data = {
        id: id,
        vote_id: vote_id,
        vote_nominee: request.query.id,
        vote_uid: siteData.uid,
        vote_category: request.query.category,
        vote_app: app_configuration.app_customer_id
    }
    console.log(data);
    //  Step 1: Query the data
    firObj.database().ref('votes/').orderByChild('vote_id').equalTo(vote_id).once('value', function (snapshot) {
        if (snapshot.val() != null) {
            console.log('Vote already exists. Do nothing.');
            response.render('invalidvote', {
                response: 200,
                success: true,
                site_title: app_configuration.app_main.app_title,
                data: siteData
            });
        } else {
            console.log('Vote not available. Add vote');
            //  Step 2: Save Data
            firObj.database().ref('votes').child(id).set(data).then(function () {
                //  Save Successful.
                if (request.session.email) {
                    response.render('vote', {
                        response: 200,
                        success: true,
                        site_title: app_configuration.app_main.app_title,
                        data: siteData
                    });
                } else {
                    response.render('email', {
                        response: 200,
                        success: true,
                        site_title: app_configuration.app_main.app_title,
                        data: siteData
                    });
                }
            }).catch(function (error) {
                //  An error happened.
                //  Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorMessage);
                response.status(404).json(errorMessage);
            });
        }
    });
});

//  BONUS - Sponsorship Inquiry
app.post('/sponsors/inquiry', function (request, response) {
    var id = randomstring.generate(25)
    var data = {
        inquiry_id: id,
        inquiry_app: app_configuration.app_customer_id,
        inquiry_name: request.body.inquiry_name,
        inquiry_email: request.body.inquiry_email,
        inquiry_message: request.body.inquiry_message
    }
    firObj.database().ref('inquiries').child(id).set(data).then(function () {
            //  Save Successful.
            response.render('inquiry', {
                response: 200,
                success: true,
                site_title: app_configuration.app_main.app_title,
                data: siteData
            });
        }).catch(function (error) {
            //  An error happened.
            //  Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            response.status(404).json(errorMessage);
        });
});

//  BONUS - Voting System - Capture Email
app.get('/nominee/email', function(request, response){
    response.render('email', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

app.post('/nominee/emailcapture', function (request, response) {
    var id = randomstring.generate(25)
    var data = {
        lead_id: id,
        lead_app: app_configuration.app_customer_id,
        lead_email: request.body.email,
    }
    firObj.database().ref('leads').child(id).set(data).then(function () {
        //  Save Successful.
        request.session.email = request.body.email;
        response.redirect('/nominees/vote');
    }).catch(function (error) {
        //  An error happened.
        //  Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorMessage);
        response.status(404).json(errorMessage);
    });
});

//  BONUS - Voting System - Invalid Attempt
app.get('/nominees/invalidvote', function (request, response) {
    response.render('invalidvote', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});

//  BONUS - Voting System - Valid Attempt
app.get('/nominees/vote', function (request, response) {
    response.render('vote', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: siteData
    });
});




/// SITE ADMIN
//  11. Site Admin - Main
app.get('/admin', function (request, response) {
    var user = firObj.auth().currentUser;
    if (user) {
        response.redirect('/admin/home');
    } else {
        response.status(200).render('admin-index', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: {
                "login-success": true,
                "status_message": "Sign into your Gumbo account.",
                "google_maps_api_key": "AIzaSyCjCVkU7YnGfown4_i_sm6X36HP2jWTv54"
            }
        });
    }
});

//  12. Site Admin - Login Action ::: [Function located in auth.js]
app.post('/admin/login', function (request, response) {
    console.log(request.body);
    firObj.auth().signInWithEmailAndPassword(request.body.username, request.body.password).then(function () {
        //  Login successful.
        firObj.auth().onAuthStateChanged(function (user) {
            if (user) {
                console.log(firObj.auth().currentUser);
                response.send({
                    redirect: '/admin/home'
                });
            } else {
                console.log('No user is here.');
                response.status(404).json("There was an error. Please try again.");
            }
        });
    }).catch(function (error) {
        //  Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorMessage);
        response.status(404).json(errorMessage);
    });
});

//  13. Site Admin - Create Account Page ::: [Function located in auth.js]
app.get('/admin/createaccount', function (request, response) {
    response.status(200).render('admin-register', {
        response: 200,
        success: true,
        site_title: app_configuration.app_main.app_title,
        data: {
            "login-success": true,
            "status_message": "Sign into your Gumbo account.",
            "google_maps_api_key": "AIzaSyCjCVkU7YnGfown4_i_sm6X36HP2jWTv54"
        }
    });
});

//  14. Site Admin - Register Action ::: [Function located in auth.js]
app.post('/admin/registeruser', function (request, response) {
    console.log('Created account');
    firObj.database().ref('customer-id').orderByChild('id').equalTo(request.body.customerId).once('value').then(function (snapshot) {
        console.log("Customer ID's");
        if (snapshot.exists()) {
            firObj.auth().createUserWithEmailAndPassword(request.body.username, request.body.password).then(function () {
                //  Registration successful.
                firObj.auth().onAuthStateChanged(function (user) {
                    if (user) {
                        firObj.database().ref('users/' + user.uid).set({
                            email: request.body.username,
                            role_id: 2
                        }).then(function () {
                            // Registration successful.
                            response.send({
                                redirect: '/admin/home'
                            });
                        }).catch(function (error) {
                            // An error happened.
                            // Handle Errors here.
                            var errorCode = error.code;
                            var errorMessage = error.message;
                            console.log(errorMessage);
                            response.status(404).json(errorMessage);
                        });
                    } else {
                        console.log('No user is here');
                        response.status(404).json("There was an error. Please try again.");
                    }
                });
            }).catch(function (error) {
                // An error happened.
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorMessage);
                response.status(404).json(errorMessage);
            });
        } else {
            console.log('Incorrect Customer ID.');
            response.status(404).json("Incorrect customer id. Please contact your system administrator.");
        }
    }, function (error) {
        // An error happened.
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorMessage);
        response.status(404).json(errorMessage);
    });
});

//  15. Site Admin - Logout ::: [Function located in auth.js]
app.get('/admin/logout', function (request, response) {
    console.log('Logged Out');
    firObj.auth().signOut().then(function () {
        // Sign-out successful.
        firObj.auth().onAuthStateChanged(function (user) {
            if (user) {
                console.log(user);
            } else {
                console.log('No user is here.');
                //  response.status(200).json({success: 'Successfully Logged Out'});
                response.redirect('/admin');
            }
        });
    }).catch(function (error) {
        // An error happened.
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorMessage);
        response.status(404).json(errorMessage);
    });
});

//  16. Site Admin - Home
app.get('/admin/home', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        firObj.database().ref('customer-settings/').child(app_configuration.app_customer_id).once('value').then(function (snapshot) {
            var dataObject = {
                site_title: snapshot.child('site_title').val() || "Event Name",
                site_long_description: snapshot.child('about_long').val() || "Provide long description of Event",
                site_short_description: snapshot.child('about_short').val() || "Provide description summary of Event",
                site_address: snapshot.child('loc_address').val() || "Type in Address",
                site_city: snapshot.child('loc_city').val() || "Type in City",
                site_state: snapshot.child('loc_state').val() || "Type in State",
                site_name: snapshot.child('loc_name').val() || "Type in Name of Location (Optional)",
                site_social_facebook: snapshot.child('facebook').val() || "Type in Facebook URL",
                site_social_instagram: snapshot.child('instagram').val() || "Type in Instagram URL",
                site_social_twitter: snapshot.child('twitter').val() || "Type in Twitter URL",
                site_nominees: snapshot.child('site_nominees').val(),
                site_performers: snapshot.child('site_performers').val(),
                site_sponsors: snapshot.child('site_sponsors').val(),
                site_staff: snapshot.child('site_staff').val(),
                brand_description_header: snapshot.child('brand_description_header').val() || "Type in brand description header",
                brand_description: snapshot.child('brand_description').val() || "Type in brand description"
            };
            response.render('admin-home', {
                response: 200,
                success: true,
                site_title: app_configuration.app_main.app_title,
                data: siteData
            });
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
            response.redirect('/admin/logout');
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  17. Site Admin - Update Event Site
app.post('/admin/updatesite', function (request, response) {
    var user = firObj.auth().currentUser;
    if (user) {
        _.each(Object.keys(request.body), function (key) {
            firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child(key).set(request.body[key]).then(function () {
                //  Save Successful.
            }).catch(function (error) {
                //  An error happened.
                //  Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorMessage);
                response.status(404).json(errorMessage);
            });
            console.log(key);
        });
        response.redirect('/admin/home');
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  . Site Admin - Users
app.get('/admin/users', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        firObj.database().ref('users/').once('value').then(function (snapshot) {
            response.render('superadmin/home', {
                title: 'Home',
                data: snapshot
            });
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
            response.render('superadmin/home', {
                title: 'Home',
                data: snapshot
            });
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  . Site Admin - Roles
app.get('/admin/nominees', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        response.render('admin-nominees', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  . Site Admin - Performers
app.get('/admin/performers', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        response.render('admin-performers', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  . Site Admin - Sponsors Types
app.get('/admin/sponsors_types', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        firObj.database().ref('users/').once('value').then(function (snapshot) {
            response.render('superadmin/home', {
                title: 'Home',
                data: snapshot
            });
        }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
            response.render('superadmin/home', {
                title: 'Home',
                data: snapshot
            });
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});


/// ADMIN CATEGORIES
//  20. Site Admin - Categories
app.get('/admin/categories', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        response.render('admin-categories', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  21. Site Admin - Add Category
app.get('/admin/add_categories', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        response.render('admin-addcategories', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  22. Site Admin - Category Add
app.post('/admin/add_categories/add', function (request, response) {
    console.log('Current User');
    var id = randomstring.generate(25)
    var data = {
        id: id,
        name: request.body.category
    }
    console.log(data);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_categories").child(id).set(data).then(function () {
            //  Save Successful.
            response.redirect('/admin/add_categories');
        }).catch(function (error) {
            //  An error happened.
            //  Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            response.status(404).json(errorMessage);
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  22. Site Admin - Category Delete
app.get('/admin/add_categories/delete/:id', function (request, response) {
    console.log('Current User');
    console.log(request.params);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_categories").child(request.params['id']).set(null).then(function () {
            //  Save Successful.
            response.redirect('/admin/categories');
        }).catch(function (error) {
            //  An error happened.
            //  Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            response.status(404).json(errorMessage);
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});


/// ADMIN NOMINEES
//  23. Site Admin - Nominees
app.get('/admin/nominees', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        response.render('admin-nominees', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  24. Site Admin - Add Nominees
app.get('/admin/add_nominees', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        response.render('admin-addnominee', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  25. Site Admin - Nominees Add
app.post('/admin/add_nominees/add', function (request, response) {
    console.log('Current User');
    console.log(request.body);
    var id = randomstring.generate(25)
    var data = {
        id: id,
        nominee_name: request.body.nominee_name,
        nominee_hometown: request.body.nominee_hometown,
        nominee_about: request.body.nominee_about,
        nominee_image: id,
        nominee_facebook: request.body.nominee_facebook,
        nominee_instagram: request.body.nominee_instagram,
        nominee_twitter: request.body.nominee_twitter,
        nominee_category: request.body.nominee_category
    }
    console.log(data);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_nominees").child(id).set(data).then(function () {
            //  Save Successful.
            response.redirect('/admin/nominees');
        }).catch(function (error) {
            //  An error happened.
            //  Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            response.status(404).json(errorMessage);
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  26. Site Admin - Nominees Delete
app.get('/admin/add_nominees/delete/:id', function (request, response) {
    console.log('Current User');
    console.log(request.params);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_nominees").child(request.params['id']).set(null).then(function () {
            //  Save Successful.
            response.redirect('/admin/nominees');
        }).catch(function (error) {
            //  An error happened.
            //  Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            response.status(404).json(errorMessage);
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  27. Site Admin - Nominees Edit
app.get('/admin/add_nominees/edit/:id', function (request, response) {
    console.log('Current User');
    console.log(request.params);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_nominees").child(request.params['id']).once('value', function (snapshot) {
            if (snapshot.exists()) {
                var dataObject = {
                    id: snapshot.child('id').val(),
                    nominee_name: snapshot.child('nominee_name').val() || "Nominees Name",
                    nominee_about: snapshot.child('nominee_about').val() || "About nominee",
                    nominee_category: snapshot.child('nominee_category').val() || "Nominees Category",
                    nominee_hometown: snapshot.child('nominee_hometown').val() || "Event Name",
                    nominee_facebook: snapshot.child('nominee_facebook').val() || "Event Name",
                    nominee_twitter: snapshot.child('nominee_twitter').val() || "Event Name",
                    nominee_instagram: snapshot.child('nominee_instagram').val() || "Event Name",
                    site_categories: siteData.site_categories,
                }
                response.render('admin-editnominee', {
                    response: 200,
                    success: true,
                    site_title: app_configuration.app_main.app_title,
                    data: dataObject
                });
            } else {
                response.redirect('/admin/nominees');
            }
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  28. Site Admin - Update Nominee
app.post('/admin/add_nominees/update', function (request, response) {
    var user = firObj.auth().currentUser;
    var id = request.body.id;
    console.log(request.body)
    if (user) {
        _.each(Object.keys(request.body), function (key) {
            if (key != "id") {
                firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_nominees").child(id).child(key).set(request.body[key]).then(function () {
                    //  Save Successful.
                }).catch(function (error) {
                    //  An error happened.
                    //  Handle Errors here.
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    console.log(errorMessage);
                    response.status(404).json(errorMessage);
                });
            }
            console.log(key);
        });
        response.send({
            redirect: '/admin/nominees'
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});


/// ADMIN SPONSORS
//  29. Site Admin - Sponsors
app.get('/admin/sponsors', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        response.render('admin-sponsors', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  24. Site Admin - Add Sponsors
app.get('/admin/add_sponsors', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        response.render('admin-addsponsor', {
            response: 200,
            success: true,
            site_title: app_configuration.app_main.app_title,
            data: siteData
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  25. Site Admin - Sponsors Add
app.post('/admin/add_sponsors/add', function (request, response) {
    console.log('Current User');
    console.log(request.body);
    var id = randomstring.generate(25);
    var data = {
        id: id,
        sponsor_name: request.body.sponsor_name,
        sponsor_level: request.body.sponsor_level,
        sponsor_about: request.body.sponsor_about,
        sponsor_image: id,
        sponsor_url: request.body.sponsor_url,
    }
    console.log(data);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_sponsors").child(id).set(data).then(function () {
            //  Save Successful.
            response.redirect('/admin/sponsors');
        }).catch(function (error) {
            //  An error happened.
            //  Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            response.status(404).json(errorMessage);
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  26. Site Admin - Nominees Delete
app.get('/admin/add_sponsors/delete/:id', function (request, response) {
    console.log('Current User');
    console.log(request.params);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_sponsors").child(request.params['id']).set(null).then(function () {
            //  Save Successful.
            response.redirect('/admin/sponsors');
        }).catch(function (error) {
            //  An error happened.
            //  Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            response.status(404).json(errorMessage);
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  27. Site Admin - Nominees Edit
app.get('/admin/add_sponsors/edit/:id', function (request, response) {
    console.log('Current User');
    console.log(request.params);
    var user = firObj.auth().currentUser;
    if (user) {
        firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_sponsors").child(request.params['id']).once('value', function (snapshot) {
            if (snapshot.exists()) {
                var dataObject = {
                    id: snapshot.child('id').val(),
                    sponsor_name: snapshot.child('sponsor_name').val() || "Sponsor Name",
                    sponsor_level: snapshot.child('sponsor_level').val() || "Sponsor Level",
                    sponsor_about: snapshot.child('sponsor_about').val() || "About Sponsor",
                    sponsor_url: snapshot.child('nominee_hometown').val() || "Event Name",
                    site_sponsor_levels: ["Platinum", "Gold", "Silver"]
                }
                response.render('admin-editsponsor', {
                    response: 200,
                    success: true,
                    site_title: app_configuration.app_main.app_title,
                    data: dataObject
                });
            } else {
                response.redirect('/admin/sponsors');
            }
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

//  28. Site Admin - Update Sponsors
app.post('/admin/add_sponsors/update', function (request, response) {
    var user = firObj.auth().currentUser;
    var id = request.body.id;
    console.log(request.body)
    if (user) {
        _.each(Object.keys(request.body), function (key) {
            if (key != "id") {
                firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).child("site_sponsors").child(id).child(key).set(request.body[key]).then(function () {
                    //  Save Successful.
                }).catch(function (error) {
                    //  An error happened.
                    //  Handle Errors here.
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    console.log(errorMessage);
                    response.status(404).json(errorMessage);
                });
            }
            console.log(key);
        });
        response.send({
            redirect: '/admin/sponsors'
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

/// ADMIN Votes
//  29. Site Admin - Votes
app.get('/admin/votes', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        firObj.database().ref('votes/').orderByChild('vote_app').equalTo(app_configuration.app_customer_id).once('value', function (snapshot) {
            console.log('Vote not available. Add vote');
            siteData.nominee_votes = snapshot.val();
            response.render('admin-votes', {
                response: 200,
                success: true,
                site_title: app_configuration.app_main.app_title,
                data: siteData
            });
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});

/// ADMIN Inquiries
//  29. Site Admin - Votes
app.get('/admin/inquiries', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        firObj.database().ref('inquiries/').orderByChild('inquiry_app').equalTo(app_configuration.app_customer_id).once('value', function (snapshot) {
            console.log('Inquiries');
            siteData.inquiries = snapshot.val();
            response.render('admin-inquiries', {
                response: 200,
                success: true,
                site_title: app_configuration.app_main.app_title,
                data: siteData
            });
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});


/// ADMIN Lead Generator
//  29. Site Admin - Votes
app.get('/admin/leads', function (request, response) {
    console.log('Current User');
    var user = firObj.auth().currentUser;
    if (user) {
        console.log(user.uid);
        firObj.database().ref('leads/').orderByChild('lead_app').equalTo(app_configuration.app_customer_id).once('value', function (snapshot) {
            console.log('Leads');
            siteData.leads = snapshot.val();
            response.render('admin-leads', {
                response: 200,
                success: true,
                site_title: app_configuration.app_main.app_title,
                data: siteData
            });
        });
    } else {
        console.log(user);
        response.redirect('/admin/logout');
    }
});


//  Setup Additional Variables
var isCustomer;
var siteData;
var nomineeImages = new Array();

//  Setup Node JS Functions
//function upload_music_to_awsS3(file) {
//    //  Create data object for upload.
//    var aws_s3_key_name = "/music" + file.name; //  Based on the name of the file.
//    var aws_s3_body = file.data; //  The actual file or text.
//    console.log("File for upload:::" + aws_s3_key_name + ', ' + aws_s3_body);
//
//    //  Handle the file upload to S3...Uncomment for live version.
//    var params = {
//        Bucket: aws_s3_bucket_name,
//        Key: aws_s3_key_name,
//        Body: 'Hello World!',
//        ACL: 'public-read',
//    };
//    aws_s3.upload(params, function (err, data) {
//        if (err) {
//            console.log('error in callback');
//            console.log(err);
//        }
//        console.log("Successfully uploaded data to " + aws_s3_key_name);
//        console.log(data);
//    });
//}

function delete_music_from_awsS3() {

}

function sample_function(param) {
    console.log(param);
}

//  Setup Server
var httpServer = require('http').createServer(app);
httpServer.setTimeout(72000000);
httpServer.timeout = 72000000;
httpServer.agent = ({ keepAlive: true });
httpServer.listen(port, function () {
    console.log('Express running on port ' + port + '.');
    firObj.database().ref('customer-settings/' + app_configuration.app_customer_id).on('value', function (snapshot) {
        if (snapshot.exists()) {
            isCustomer = true
            var dataObject = {
                site_title: snapshot.child('site_title').val() || "Event Name",
                site_long_description: snapshot.child('about_long').val() || "Provide long description of Event",
                site_short_description: snapshot.child('about_short').val() || "Provide description summary of Event",
                site_address: snapshot.child('loc_address').val() || "Type in Address",
                site_city: snapshot.child('loc_city').val() || "Type in City",
                site_state: snapshot.child('loc_state').val() || "Type in State",
                site_name: snapshot.child('loc_name').val() || "Type in Name of Location (Optional)",
                site_social_facebook: snapshot.child('facebook').val() || "Type in Facebook URL",
                site_social_instagram: snapshot.child('instagram').val() || "Type in Instagram URL",
                site_social_twitter: snapshot.child('twitter').val() || "Type in Twitter URL",
                site_categories: snapshot.child('site_categories').val() || new Object(),
                site_nominees: snapshot.child('site_nominees').val() || new Object(),
                site_performers: snapshot.child('site_performers').val() || new Object(),
                site_sponsors: snapshot.child('site_sponsors').val() || new Object(),
                site_staff: snapshot.child('site_staff').val() || new Object(),
                brand_description_header: snapshot.child('brand_description_header').val() || "Type in brand description header",
                brand_description: snapshot.child('brand_description').val() || "Type in brand description",
                site_ticketing_information: snapshot.child('site_ticketing_information').val() || "Type in link for ticketing",
                site_sponsor_levels: ["Platinum", "Gold", "Silver", "Media"]
            };
            siteData = dataObject;
            Object.keys(siteData.site_nominees).forEach(function (child) {
                nomineeImages.push("/assets/imgs/nominees/"+siteData.site_nominees[child].nominee_instagram.toString().toUpperCase().replace(/\s/g, " ")+".png");
            });
        } else {
            isCustomer = false
        }
    });
});


///
///
///
///
///
//  Use the below code when you want to send a Ajax request directly to an endpoint and update the data on the screen.
/*
START THE ENDPOINT
app.post('/[endpoint name]', function(request, response) {
    console.log(request.body);
    var form_username = request.body.username;
    var form_password = request.body.password;

    if (form_password === '123456') {
        response.redirect('/' + '230838hisodbsnvusi' + '/home');
    } else {
        response.status(200).send({
            response: 200,
            message: "Invalid Credentials. Please try again.",
            success: true,
            data: {
                key :"key"
            }
        });
    }
});
END THE ENDPOINT

START THE FUNCTION IN THE JS FILE
$(function () {
    $('#form-login').submit(function(e){
        e.preventDefault();
        console.log('Form submitted.');
        var formData = {
            'username'            : $('input[name=username]').val(),
            'password'            : $('input[name=password]').val(),
        };
        $.ajax({
            type: 'POST',
            data: JSON.stringify(formData),
            contentType: 'application/json',
            url: '/test-function',						
            success: function(data) {
                console.log('success');
                console.log(JSON.stringify(data));
            }
        });
    })
})
*/
