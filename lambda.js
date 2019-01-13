'use strict';

exports.handler = (event, context, callback) => {
  // ================================
  // Define your backups
  // ================================

  const instanceName = "LTPlabs-Website-V2" // Put your instance name here http://take.ms/dChbs
  const backupDaysMax = 7; // keep at least 7 daily backups

  // ================================
  // Create an AWS Lightsail client
  // ================================

  var AWS = require('aws-sdk');
  AWS.config.update({ region: 'eu-west-1' });
  var Lightsail = new AWS.Lightsail();

  // ================================
  // Dates calculations for the name
  // ================================

  var now = new Date();
  var oneDay = 1000 * 60 * 60 * 24;
  var backupDaysNR = now.getDay() % backupDaysMax;

  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var day = now.getDate();
  // random so multiple snapshots in the same day are fine
  var rand = Math.floor((Math.random() * 1000) + 1000);
  var today = year + '-' + month + '-' + day + '-' + rand;
  console.log('today + random: ' + today);

  // ================================
  // CREATE A NEW SNAPSHOT
  // ================================

  // Check if the snapshot already exists
  var params = {
    "instanceSnapshotName": instanceName + '-' + today
  }

  Lightsail.getInstanceSnapshot(params, function (err, data) {
    if (err) { //console.log(err, err.stack); // an error occurred
      console.log('There is no backup with this name, lets create a new one');
      newDaySnapshot(instanceName, backupDaysNR);
    }
    else {
      console.log(data);  // successful response
      console.log('Backup already exists, not doing anything');
    }
  });

  function newDaySnapshot(instanceName, backupDaysNR) {
    var params = {
      instanceName: instanceName,
      instanceSnapshotName: instanceName + '-' + today
    };

    Lightsail.createInstanceSnapshot(params, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
      }
      else {
        // console.log(data); // successful response
        console.log('Created snapshot ' + instanceName + '-' + today);
      }
    });
  }

  // ================================
  //  DELETING OLD SNAPSHOTS
  // ================================

  var params = {};
  var backupDaysTillNow;
  var backupDate;

  Lightsail.getInstanceSnapshots(params, getSnapshots);

  function getSnapshots(err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
    }
    else {
      // Browse through ALL snapshots
      for (var i = 0; i < data.instanceSnapshots.length; i++) {
        var backupFromInstance = data.instanceSnapshots[i].fromInstanceName;
        backupDate = new Date(data.instanceSnapshots[i].createdAt);
        backupDaysTillNow = Math.floor((now - backupDate) / oneDay);

        // Select the ones from our instance alone
        if (backupFromInstance == instanceName) {
          // Select old snapshots
          if (backupDaysTillNow > backupDaysMax) {
            console.log('This backup is due to be deleted with an age of ' + backupDaysTillNow + ' days')
            var paramsDelete = {
              "instanceSnapshotName": data.instanceSnapshots[i].name
            }
            Lightsail.deleteInstanceSnapshot(paramsDelete, function () {
              if (err) console.log(err, err.stack);
              else console.log('Deleted ' + data.instanceSnapshots[i].name)
            });
          }
        }
        else {
          console.log('Will ignore this backup because it belongs to an instance other than ' + instanceName);
        }
      }
    }
  }
};