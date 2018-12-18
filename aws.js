'use strict';

const AWS                 = require('aws-sdk');
const configs             = require('./configs.js');

var s3; 

function setup() {
    console.log('Setting up AWS & S3');
    AWS.config.update({
        accessKeyId: configs.s3AccessKey,
        secretAccessKey: configs.s3SecretKey
    });
    s3 = new AWS.S3();
}

module.exports.setup = function awsSetup() {
    setup();
};

module.exports.s3 = s3;