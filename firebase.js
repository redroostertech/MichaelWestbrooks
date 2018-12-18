'use strict';

var firebase            = require('firebase');
var admin               = require('firebase-admin');
var configs             = require('./configs');
var serviceAccount      = require('./mvp-app-698eb-firebase-adminsdk-7f7na-606bb5b541.json');  //  MARK:- Uncomment and provide url to service account .json file.
const {Storage}         = require('@google-cloud/storage');

require("firebase/auth");
require("firebase/database");
require("firebase/messaging");
require("firebase/functions");
require("firebase/storage");

//  MARK:- Setup Firebase App
var firebaseObj;
var firebaseAdmin;
var firbaseStorage;
var firebaseFirestoreDB; 
var firebaseRealtimeDB;

var settings = { timestampsInSnapshots: true };
var firebase_configuration = {
    apiKey: process.env.FIRAPIKEY || configs.firebaseApiKey,
    authDomain: process.env.FIRDOM || configs.firebaseAuthDomain,
    databaseURL: process.env.FIRDBURL || configs.firebaseDatabaseUrl,
    projectId: process.env.FIRPROJ || configs.firebaseProjectId,
    storageBucket: process.env.FIRSTOR || configs.firebaseStorageBucket,
    messagingSenderId: process.env.FIRMES || configs.firebaseMessagingSenderId,
};

function setupFirebaseApp(callback) {
    if (!firebase.apps.length) {
        firebaseObj = firebase.initializeApp(firebase_configuration);
    } else {
        firebaseObj = firebase.app();
    }
    callback();
}

function setupAdminFirebaseApp(callback) {
    firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: configs.firebaseDatabaseUrl,
        storageBucket: configs.firebaseStorageBucket
    });
    callback();
}

function setupRealtimeDB(callback) {
    firebaseRealtimeDB = firebase.database();
    callback();
}

function setupFirestoreDB(callback) {
    firebaseFirestoreDB = admin.firestore()
    firebaseFirestoreDB.settings = settings;
    callback();
}

function setupFirebaseStorage(callback) {
    firbaseStorage = new Storage({
        projectId: configs.firebaseProjectId,
        keyFilename: './mvp-app-698eb-firebase-adminsdk-7f7na-606bb5b541.json'
    });
}

module.exports.setup = function firebaseSetup() {
    console.log('Setting up Firebase');
    setupFirebaseApp(function() {
        console.log('Completed setting up base firebase app');
    });
    setupAdminFirebaseApp(function() {
        console.log('Completed setting up base firebase admin app');
    });
    setupRealtimeDB(function() {
        console.log('Completed setting up base realtime db');
    });
    setupFirestoreDB(function() {
        console.log('Completed setting up base firebase firestore db');
    });
    setupFirebaseStorage(function() {
        console.log('Completed setting up base firebase storage app');
    });
};
module.exports.firebase_main = firebaseObj;
module.exports.firebase_admin = firebaseAdmin;
module.exports.firebase_firestore_db = firebaseFirestoreDB;
module.exports.firebase_realtime_db = function setupRealtimeDB(callback) {
    callback(firebaseObj.database());
}
module.exports.firebase_storage = firbaseStorage;
// module.exports.firebase_storage_bucket = firPrimaryStorageBucket;