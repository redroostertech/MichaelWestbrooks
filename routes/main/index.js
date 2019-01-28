const express           = require('express');
const router            = express.Router();
const bodyParser        = require('body-parser');
const dynamicAddresses  = require('country-state-city');
const path              = require('path');
const session           = require('client-sessions');
const ok                = require('async');
const randomstring      = require('randomstring');
const formidable        = require('formidable');
const _                 = require('underscore');
const main              = require('../../app');
const configs           = require('../../configs');

router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json());

// var screenIds = ["SplashPage", "LoginSignUpPage", "MenuStylePage", "EcommercePage", "BookingPage", "EventPage","NewsFeedPage"]

//  MARK:- Manage endpoints
router.get('/', function(req, res) {
    res.status(200).render('main/index');
});

var venuemanagementController = require(path.join(configs.basePathRoutes, '/main/venuemanagement/index.js'));
router.use('/venuemanagement', venuemanagementController);

module.exports = router;