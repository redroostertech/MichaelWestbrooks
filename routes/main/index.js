let express           = require('express');
let router            = express.Router();
let bodyParser        = require('body-parser');
let dynamicAddresses  = require('country-state-city');
let path              = require('path');
let session           = require('client-sessions');
let ok                = require('async');
let randomstring      = require('randomstring');
let formidable        = require('formidable');
let _                 = require('underscore');
let main              = require('../../app');
let configs           = require('../../configs');

let leads             = require('../../routes/api/v1/test-data/json/igrushi-leads2018.json');

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
    res.status(200).render('admin/login');
});

router.get('/data', function(req, res) {
    res.status(200).render('main/data-table', {
        "data" : leads,
    });
});

var venuemanagementController = require(path.join(configs.basePathRoutes, '/main/venuemanagement/index.js'));
router.use('/venuemanagement', venuemanagementController);

module.exports = router;