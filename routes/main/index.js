const express           = require('express');
const router            = express.Router();
const main              = require('../../app.js');
const bodyParser        = require('body-parser');
const dynamicAddresses  = require('country-state-city');
const path              = require('path');
const session           = require('client-sessions');
const ok                = require('async');
const randomstring      = require('randomstring');
const formidable        = require('formidable');
const _                 = require('underscore');
const twilioFunctions   = require('../functions/twilioFunctions.js');


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
    res.status(200).render('main/twilio-signup');
});

router.get('/twilio-view-venues', function(req, res) {
    twilioFunctions.getVenues(req, res);
});

router.get('/twilio-view-users', function(req, res) {
    twilioFunctions.getUsers(req, res);
});

router.get('/twilio-upload-venue', function(req, res) {
    twilioFunctions.loadVenueUpload(res);
});

router.get('/twilio-view-venue', function(req, res) {
    console.log(req.query);
    twilioFunctions.getVenueWithId(req.query.id, res);
});

router.get('/twilio-edit-venue', function(req, res) {
    console.log(req.query);
    twilioFunctions.editVenueWithId(req.query.id, res);
});

router.get('/twilio-view-sections', function(req, res) {
    console.log(req.query);
    twilioFunctions.getSectionsAtVenueWithId(req.query.id, res);
});

module.exports = router;