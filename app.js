// Include the cluster module
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for terminating workers
    cluster.on('exit', function (worker) {

        // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {
    const express           = require('express');
    const bodyParser        = require('body-parser');
    const path              = require('path');
    const session           = require('client-sessions');
    const firebase          = require('./firebase.js');
    const aws               = require('./aws.js');
    const configs           = require('./configs');
    const fs                = require('fs');
    const NodeCache         = require('node-cache');
    const twilio            = require('twilio');


    //  MARK:- Setup additional variables
    var oneDay          = 86400000;
    var port            = process.env.PORT || configs.port;
    var siteTitle       = process.env.SITE_TITLE || configs.siteTitle;

    //  MARK:- Setup App.
    var app = express();
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(express.static(__dirname + '/public', { 
        maxage: oneDay * 21 
    }));
    app.use(bodyParser.urlencoded({extended:true}));
    app.use(bodyParser.json());
    app.use(session({
        cookieName: process.env.COOKIENAME || configs.cookieName,
        secret: process.env.COOKIESEC || configs.cookieSecret,
        duration: 60 * 60 * 1000,
        activeDuration: 5 * 60 * 1000,
    }));

    var nodeCache = new NodeCache({ 
        stdTTL: 0, 
        checkperiod: 604800,
        useClones: true
    });

    var twilioClient = new twilio(configs.twilioAccountSid, configs.twilioAuthToken);

    //  MARK:- Set up routes.
    var mainController = require(path.join(configs.basePathRoutes, '/main/index.js'));
    var apiController = require(path.join(configs.basePathRoutes, '/api/v1/index.js'));
    
    //  MARK:- Use Routes
    app.use('/', mainController);
    app.use('/api/v1', apiController);

    //  MARK:- Create catch all's
    // app.all('/*', function(req, res){
    //     showErrorPage(res);
    // });
    
    // app.all('/admin/*', function(req, res){
    //     show404Page(res);
    // });

    //  MARK:- Start Server
    var port = process.env.PORT || 1337;

    var httpServer = require('http').createServer(app);
    httpServer.setTimeout(72000000);
    httpServer.timeout = 72000000;
    httpServer.agent= false;
    httpServer.listen(port, function() {
        console.log(siteTitle +' running on port ' + port + '.');
        firebase.setup();
        //  aws.setup();
    });

    //  MARK:- Utility Methods
    function show404Page(res) {
        res.status(200).render('404');
    }
    
    function showErrorPage(res) {
        res.status(200).render('error');
    }

    module.exports.port = port;
    module.exports.firebase = firebase;
    module.exports.cache = nodeCache;
    module.exports.twilio = twilio;
    module.exports.twilioClient = twilioClient;
}