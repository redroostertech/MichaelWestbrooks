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

module.exports = router;