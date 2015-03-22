
Meteor.methods({

  // enable/disable a location for the current user
  toggleLocation: function(locationCode) {
    var user = Meteor.user();
    if(!user) {
      throw new Meteor.Error('not-authorized');
    }
    check(locationCode, String);
    
    var location = Locations.findOne({code: locationCode});
    if(!location) {
      throw new Meteor.Error('Invalid location code');
    }
  
    if(user.locations && _.contains(user.locations, locationCode)) {
      // remove code from user.locations
      Meteor.users.update({_id: user._id}, {$pullAll: {locations: [locationCode]}}); 
    }
    else {
      // add code to user.locations
      Meteor.users.update({_id: user._id}, {$addToSet: {locations: locationCode}}); 
    }
  },
  
  // enable/disable notifications for a location for a particular device
  toggleDeviceLocation: function(deviceId, locationCode) {
    check(deviceId, String);
    check(locationCode, String);

    var device = Devices.findOne({_id: deviceId});
    if(! device || device.user !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    var location = Locations.findOne({code: locationCode});
    if(!location) {
      throw new Meteor.Error('Invalid location code');
    }

    if(device.locations && _.contains(device.locations, locationCode)) {
      // remove code from device.locations
      Devices.update({_id: device._id}, {$pullAll: {locations: [locationCode]}});
    }
    else {
      // add code to device.locations
      Devices.update({_id: device._id}, {$addToSet: {locations: locationCode}});
    }
  },

  // mark the terms of service read for a particular user
  // any time version is bumped users will need to read again
  markTosRead: function (version) {
    if(! Meteor.userId())
      throw new Meteor.Error("not-authorized");

    check(version, Match.Integer);

    Meteor.users.update({_id: Meteor.userId()}, {$set: {tos_read: version}});
  },

  // mark the setup assistant as completed
  completeSetupassistant: function (deviceId, locationCode) {
    var user = Meteor.user();
    if(!user) {
      throw new Meteor.Error('not-authorized');
    }

    check(locationCode, String);
    check(deviceId, String);

    var device = Devices.findOne({_id: deviceId});
    if(! device || device.user !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    var location = Locations.findOne({code: locationCode});
    if(!location) {
      throw new Meteor.Error('Invalid location code');
    }

    // add code to device.locations
    Devices.update({_id: device._id}, {$addToSet: {locations: locationCode}});
    
    // add code to user.locations
    Meteor.users.update({_id: user._id}, {$addToSet: {locations: locationCode}}); 

    // mark assistant as complete
    Meteor.users.update({_id: Meteor.userId()}, {$set: {assistant: 1}});
  },

  // mark a job as acknowledged
  acknowledgeJob: function(jobId) {
    var user = Meteor.user();
    // must be logged in and a regular account (not kiosk)
    if(!user || !user.services || !user.services.beacon) throw new Meteor.Error('not-authorized');

    check(jobId, Match.Integer);

    if(Meteor.isServer) {
      // we need to be able to do some asynchronous stuff
      var Future = Npm.require('fibers/future');
      var fut = new Future();
      
      var serviceData = user.services.beacon;
      var username = serviceData.id;

      var password = OAuthEncryption.isSealed(serviceData.password) ?
        OAuthEncryption.open(serviceData.password, user._id) : serviceData.password;
      
      BeaconController.acknowledgeJob(username, password, jobId, function(error) {
        if(error) {
          if(error.message === "unauthorized") {
            fut.throw(new Meteor.Error("unauthorized"));
            return;
          }
          fut.throw(error);
          return;
        }
        fut.return();
      });
      
      return fut.wait();
    }
    else {
      // pre-emptively update client DB
      // disabled for now
      //Jobs.update({id: jobId}, {$set: {acknowledged: true, status: "Acknowledged"}});
    }
  },

});
