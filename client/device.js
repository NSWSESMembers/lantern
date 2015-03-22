// deviceController is responsible for the registration of device including
// generating and storing their UUID.

var deviceController = function () {
  var self = this;

  // load the current user's devices
  self.deviceSubscription = Meteor.subscribe('devices_mine');

  // this is wiped on page load/HCR
  self._registered = new ReactiveVar(false);
}

_.extend(deviceController.prototype, {
  register: function() {
    var self = this;
    Tracker.nonreactive(function() {
      var id = Session.get('device_id');
      var key = Session.get('device_key');
      var registered = self._registered.get();
      
      if(registered) return;

      if(id && key) {
        console.log('Attemtping to claim device with id ' + id +' and key ' + key);
        Meteor.call('claimDevice', id, key, function(error, result) {
          if(error) {
            if(error.error === "invalid-device-key") {
              console.log("Device key no longer valid - creating a new one...");
              self._createDevice();
              return;
            }
            console.log("Failed to claim device: " + error);
            return;
          }
          self._registered.set(true);
        });
      }
      else {
        self._createDevice();
      }
    });
  },
  _createDevice: function() {
    var self = this;
    key = Meteor.uuid();
    Session.setPersistent('device_key', key);

    console.log('Attempting to create device with key ' + key);
    Meteor.call('createDevice', key, function(error, result) {
      if(error) {
        console.log("Failed to create device: " + error);
        return;
      }
      Session.setPersistent('device_id', result);
      self._registered.set(true);
    });
  },
  deregister: function() {
    var self = this;
    Tracker.nonreactive(function() {
      var registered = self._registered.get();

      if(!registered) return;

      // mark as not registered immediately so we can begin re-registration
      self._registered.set(false);

      if(Session.get('device_id') && Session.get('device_key')) {
        console.log('deregister');
        Meteor.call('deregisterDevice', Session.get('device_id'),
            Session.get('device_key'), function(error, result) {
          if(error) {
            console.log("Failed to deregister device: " + error);
            return;
          }
        });
      }
    });
  },
  device: function() {
    return Devices.findOne({_id: Session.get('device_id')});
  },
  registered: function() {
    return this._registered.get();
  }
});

// this is in global scope
DeviceController = null;

// set up the DeviceController on startup, then reactively wait until we
// are either logged in or logged out and register or deregister appropriately
Meteor.startup(function() {
  DeviceController = new deviceController();

  // re-run this whenever login status changes, but only when we're not in the
  // process of logging in
  Tracker.autorun(function() {
    if(Meteor.loggingIn()) return;

    if(Meteor.user()) {
      DeviceController.register();
    }
    else {
      DeviceController.deregister();
    }
  });
});
