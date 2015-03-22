var setupApn = function() {
  var apnOptions = Meteor.settings.apnOptions || {},
      alertSound = apnOptions.sound || "alert.aiff",
      root = process.env.PWD

  apnOptions = _.extend({
    cert: process.env.APNS_CERT,
    key: process.env.APNS_KEY,
    production: true
  }, apnOptions)

  return new Apn.Connection(apnOptions);
} 

var setupGcm = function() {
  if(!process.env.GCM_SENDER_KEY) {
    console.log("Unable to load GCM_SENDER_KEY from env");
  }
  else {
    return new GCM.Sender(process.env.GCM_SENDER_KEY);
  }
}

var pusher = function() {
  var self = this;
  self.apns = setupApn();
  self.gcm = setupGcm();
}

_.extend(pusher.prototype, {
  pushAll: function(options) {
    var devices = Devices.find({});
    this.push(devices, options);
  },
  push: function(devices, options) {
    var apnsTokens = [];
    var gcmTokens = [];
    
    // extract the useful tokens from the device
    devices.forEach(function(device) {
      if(device.push && device.push.gcm) {
        gcmTokens.push(device.push.gcm);
      }
      if(device.push && device.push.apns) {
        apnsTokens.push(device.push.apns);
      }
    });
    
    if(gcmTokens.length > 0) this.pushGcm(gcmTokens, options);
    if(apnsTokens.length > 0) this.pushApns(apnsTokens, options);
  },
  pushGcm: function(tokens, options) {
    if(!options.text) throw Error("Must set options.text");
    if(Constants.disablePush) return;

    // set sound if available, otherwise send 'default'
    var sound = null;
    if(options.sound) {
      if(Constants.sounds.android[options.sound])
        sound = Constants.sounds.android[options.sound];
      else
        sound = 'default';
    }
        
    var data = options.payload || {};
    data.title = 'Lantern notification!';
    data.message = options.text;
    if(sound) data.sound = sound;
    var message = new GCM.Message({
      data: data
    });
    this.gcm.send(message, tokens, 3, function(error, result) {
      if(error) {
        console.log("Failed to send GCM: " + error); 
        return;
      }
    });
  },
  pushApns: function(tokens, options) {
    var self = this;
    if(!options.text) throw Error("Must set options.text");
    if(Constants.disablePush) return;
    var notification = new Apn.Notification();
    notification.expiry = options.expiry || Math.floor(Date.now() / 1000) + 60;
    notification.alert = options.text;
    notification.payload = options.payload || {};
    if(options.sound) {
      if(Constants.sounds.ios[options.sound])
        notification.sound = Constants.sounds.ios[options.sound];
      else
        notification.sound = 'default'; // ios default sound
    }
    
    tokens = [].concat(tokens);
    _.each(tokens, function(token) {
      try {
        var device = new Apn.Device(token);
        self.apns.pushNotification(notification, device);
      } catch(e) {
        console.log("Unable to send APNS: " + e);
      }
    });
  }
});

Pusher = new pusher();
