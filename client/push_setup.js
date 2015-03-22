// PushController is responsible for storing device push tokens and managing
// push service registration

var pushController = function () {
  var self = this;
  self.gcmSenderId = "21582460011"; // TODO: read this from config
}

_.extend(pushController.prototype, {
  registered: function() {
    return !!Session.get('push_token');
  },
  register: function() {
    var self = this;
    if(!this.registered()) {

      // must be a browser or something
      if(!window.plugins || !window.plugins.pushNotification || !device) {
        console.log("Push notifications not supported");
        return;
      }

      // android
      if(
        device.platform == 'android' ||
        device.platform == 'Android' ||
        device.platform == 'amazon-fireos'
      ) {
        console.log("Begining GCM registration");
        window.plugins.pushNotification.register(
          function(message) {
            // success, but the token is saved in the handleGCM callback below
            console.log("Push registration successful: " + message);
          },
          function(error) {
            // TODO: handle this better
            console.log("Push registration failed: " + error);
          },
          {
            "senderID": this.gcmSenderId,
            "ecb": "PushController.handleGCM",
          }
        );
      }

      // otherwise, assume iOS
      else {
        window.plugins.pushNotification.register(
          function(token) { // success
            self.savePushToken('apns', token);
          },
          function(error) { // error
            // TODO: handle this better
            console.log("Error while registering for notifications: " + error);
          },
          {
            "badge":"true",
            "sound":"true",
            "alert":"true",
            "ecb":"PushController.handleAPN"
          }
        );
      }
    }
  },
  handleAPN: function(e) {
    // TODO: display in-app notification if not handling a
    // launch-from-notification event
    if(e.foreground && e.foreground == "1") return; 
    
    if(e.job_id) {
      Router.go('jobs.job', {id: e.job_id});
    }
    else {
      console.log("Notification unhandled - no job_id");
    }
  },
  handleGCM: function(e) {
    if(e.event == 'registered') {
      // now registered for GCM, save token
      if(!e.regid.length > 0) {
        console.log("Push registration failed - invalid regid");
      }
      this.savePushToken('gcm', e.regid);
    }
    else if(e.event == 'message') {
      // TODO: display in-app notification
      if(e.foreground && e.foreground == "1") return; 

      if(e.payload && e.payload.job_id) {
        var jobid = e.payload.job_id;
        Router.go('jobs.job', {id: jobid});
      }
      else {
        console.log("Notification unhandled - no job_id");
      }
    }
    else {
      console.log("Unrecognised push event: " + JSON.stringify(e));
    }
  },
  savePushToken: function (service, token) {
    var device = DeviceController.device();
    
    if(device['push'] && device['push'][service] === token) {
      console.log("Push token already saved");
      return;
    }

    console.log("Saving push token for " + service + ": " + token);
    Meteor.call('savePushToken', Session.get('device_id'), service, token);
  }
});

// PushController is in global scope
PushController = null;

Meteor.startup(function() {
  PushController = new pushController();
  
  Tracker.autorun(function() {
    // wait until we have a registered device before registering for
    // push notifications
    if(DeviceController.registered()) {
      PushController.register();
    }
  });
});
