Meteor.methods({
  delete_me: function() {
    if(!Meteor.userId())
      throw new Meteor.Error("not-authorized");
    var userId = Meteor.userId();
    
    Devices.remove({"user": userId});
    Meteor.users.remove({"_id": userId});
  },
  log: function(deviceId, message) {
    try {
      check(deviceId, String);
      check(message, String);
    } catch(e) {
      // we have to fail silently else we end up in a horrible loop
      return;
    }

    var device = Devices.findOne({_id: deviceId});
    if(! device || device.user !== Meteor.userId()) {
      // we have to fail silently else we end up in a horrible loop
      return;
    }
    
    console.log(device['_id'] + ": " + message);
  },
  createDevice: function(key) {
    if(!Meteor.userId())
      throw new Meteor.Error("not-authorized");

    check(key, String);
    
    var data = {
      key: key,
      user: Meteor.userId(),
      created: new Date(),
      accessed: new Date()
    };
    
    var id = Devices.insert(data);
    return id;
  },
  claimDevice: function(id, key) {
    check(id, String);
    check(key, String);
    
    var device = Devices.findOne({_id: id, key: key});
    if(!device) throw new Meteor.Error("invalid-device-key")
    
    var data = {
      user: Meteor.userId(),
      accessed: new Date()
    };
    Devices.update({_id: id}, {$set: data});
  },
  deregisterDevice: function(id, key) {
    check(id, String);
    check(key, String);
    
    var device = Devices.findOne({_id: id, key: key});
    if(!device) throw new Meteor.Error("invalid-device-key")
    
    // XXX: in future this might disable push notifications or clear user data etc
  },
  savePushToken: function (id, service, token) {
    check(id, String);
    check(service, String);
    check(token, String);
    
    var validServices = ["apns", "gcm", "dummy"];
    if (! _.contains(validServices, service)) {
      throw new Meteor.Error("invalid-service");
    }
    
    var device = Devices.findOne({_id: id});
    if(! device || device.user !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
  
    var key = "push." + service;
    var update = { $set: {} };
    update['$set'][key] = token;

    Devices.update({ _id: id }, update);
  },
  pushAll: function(message, sound) {
    var user = Meteor.user();
    if(!user || !user.super) {
      throw new Meteor.Error('not-authorized');
    }
    check(message, String);

    var options = {
      text: message,
    }
    if(sound) options.sound = sound;

    Pusher.pushAll(options);
  },
  push: function(deviceId, message, sound) {
    var user = Meteor.user();
    if(!user || !user.super) {
      throw new Meteor.Error('not-authorized');
    }
    check(message, String);
    check(deviceId, Match.OneOf(String, [String]));

    var deviceIds = [].concat(deviceId);
    var devices = Devices.find({_id: {$in: deviceIds}});
    var options = {
      text: message,
    }
    if(sound) options.sound = sound;

    Pusher.push(devices, options);
  },
  sync: function(syncer) {
    var user = Meteor.user();
    if(!user || !user.super) {
      throw new Meteor.Error('not-authorized');
    }
    check(syncer, String);
  
    var Future = Npm.require('fibers/future');
    var fut = new Future();
    
    var syncController = BeaconController.syncers[syncer];
    if(!syncController)
      throw new Meteor.Error('invalid-syncer');

    syncController.syncNow(function(error) {
      if(error) {
        fut.throw(error);
        return;
      }
      fut.return();
    });
    
    // unblock this client so other methods and subscriptions can run
    this.unblock();
    return fut.wait();
  },
  createKioskCode: function(name) {
    var user = Meteor.user();

    // must be logged in and a regular account (not kiosk)
    if(!user || !user.services || !user.services.beacon)
      throw new Meteor.Error('not-authorized');
    
    // for now you must be super user
    if(!user || !user.super)
      throw new Meteor.Error('not-authorized');
    
    check(name, String);
    
    var code = _.times(6, function() {
      return Math.floor(Math.random() * 9).toString();
    }).join('');

    Meteor.users.insert({services: {kiosk: {
      creator: user._id,
      creation: new Date(),
      code: code
    }}});

    return code;
  },
  send_message: function(contact, message) {
    var user = Meteor.user();
    // must be logged in and a regular account (not kiosk)
    if(!user || !user.services || !user.services.beacon) throw new Meteor.Error('not-authorized');

    check(message, String);
    check(contact, Number);

    // we need to be able to do some asynchronous stuff
    var Future = Npm.require('fibers/future');
    var fut = new Future();
    
    var serviceData = user.services.beacon;
    var username = serviceData.id;

    var password = OAuthEncryption.isSealed(serviceData.password) ?
      OAuthEncryption.open(serviceData.password, user._id) : serviceData.password;
    
    BeaconController.sendBeaconMessage(username, password, message, contact, function(error) {
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
  },
  jobPhotoUploadInit: function(blob, name, path) {
    AWS.config.region = 'ap-southeast-2'
    var s3 = new AWS.S3({params: {Bucket: 'sdunster-lantern'}})
    var url = s3.getSignedUrl('putObject', {Key: 'job_images/'+Meteor.uuid()+'.jpg', ContentType: 'image/jpeg'});
    return url;
  },
  jobPhotoUploadComplete: function(blob, name, path) {

  }
});
