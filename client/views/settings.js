// Locations are loaded for the entire app here - this should probably be
// moved to a seperate global subscriptions file
Meteor.subscribe('locations');

// these are the syncers to show in the status screen
var syncers = [
  { id: 'job1', name: 'Job (10 sec)' },
  { id: 'job2', name: 'Job (1 min)' },
  { id: 'job3', name: 'Job (10 min)' },
  { id: 'job4', name: 'Job (hourly)' },
  { id: 'job5', name: 'Job (daily)' },
  { id: 'location', name: 'Location' },
  { id: 'contact', name: 'Contact' },
  { id: 'people', name: 'People' },
]

Router.route('/settings', {
  name: 'settings',
  template: 'settings',
});

Router.route('/settings/status', {
  name: 'settings.status',
  template: 'settings_status',
  subscriptions: function() {
    // here we load info on all the syncers (from above dict)
    var subscriptions = _.flatten(_.map(syncers, function(syncer) {
      return ['syncTime-'+syncer.id, 'syncStatus-'+syncer.id];
    }));

    // subscribe here, but don't wait on the subscription
    this.subscribe('status', subscriptions);
  }
});

Router.route('/settings/super', {
  name: 'settings.super',
  template: 'settings_super',
});

Router.route('/settings/notifications', {
  name: 'settings.notifications',
  template: 'settings_notifications',
});

Router.route('/settings/tos', {
  name: 'settings.tos',
  template: 'settings_tos',
});

Router.route('/settings/locations', {
  name: 'settings.locations',
  template: 'settings_locations',
});

var formatDate = function(date) {
  try {
    // this is pretty horrible because it varies per-browser
    return date.toLocaleTimeString();
  }
  catch(e) {
    return 'never';
  }
}

Template.settings.events({
  'click a.logout': function(e, t) {
    e.preventDefault();
    Meteor.logout();
  },
  'click a.logout_delete': function(e, t) {
    e.preventDefault();
    if(confirm('You will be logged out and all preferences, data and your '+
        'beacon credentials will be permanently deleted across all devices '+
        'using your account. Are you sure?')) {
      // yeah, this really does entirely remove your account so other devices
      // get nuked as well
      Meteor.call('delete_me', function() {
        Meteor.logout();
      });
    }
  }
});

Template.settings.helpers({
  super: function() {
    return Meteor.user().super;
  }
});

Template.settings_status.helpers({
  deviceid: function() {
    var device = getDevice();
    if(!device) return '';
    return device._id;
  },
  cordova: function() {
    if(Meteor.isCordova)
      return Meteor.isCordova() ? 'cordova' : '';
  },
  url: function() {
    return Meteor.absoluteUrl();
  },
  ddp: function() {
    var status = Meteor.status();
    if(status.reason)
      return status.status + ' - ' + status.reason;
    return status.status;
  },
  reason: function() {
    if(Meteor.reason)
      return Meteor.reason();
  },
  syncers: function() {
    return syncers;
  },
  syncTime: function() {
    return Status.get('syncTime-'+this.id).value;
  },
  syncStatus: function() {
    return Status.get('syncStatus-'+this.id).value;
  },
  syncDate: function() {
    return formatDate(Status.get('syncTime-'+this.id).updated);
  }
})

// --
// Notifications handling
// --

var getDevice = function() {
  return DeviceController.device();
}

Template.settings_notifications.helpers({
  locations: function() {
    return Locations.find({}, {sort: {name: 1}});
  }
});

Template.settings_notifications.rendered = function() {
  Tracker.autorun(function() {
    var device = getDevice();
    if(!device) return;
    var locations = device.locations;
    
    this.$('input').each(function() {
      if(locations.indexOf($(this).attr('name')) > -1) {
        $(this).prop('checked', true);
      }
    });
  });
}

Template.settings_notifications.helpers({
  locations: function() {
    return Locations.find({}, {sort: {name: 1}});
  }
});

Template.settings_notifications_location.helpers({
  enabled: function() {
    var device = getDevice();
    if(!device) return;
    
    return device.locations && device.locations.indexOf(this.code) > -1;
  }
});

Template.settings_notifications_location.events({
  'click a': function(e, t) {
    e.preventDefault();
    var device = getDevice();
    if(!device) return;
    Meteor.call('toggleDeviceLocation', device._id, this.code);
  }
});

Template.settings_locations.helpers({
  locations: function() {
    return Locations.find({}, {sort: {name: 1}});
  }
});

Template.settings_locations_location.helpers({
  enabled: function() {
    var user = Meteor.user();
    return user.locations && user.locations.indexOf(this.code) > -1;
  }
});

Template.settings_locations_location.events({
  'click a': function(e, t) {
    e.preventDefault();
    Meteor.call('toggleLocation', this.code);
  }
});

// this screen is being used to test some photo upload features
Template.settings_super.events({
  'change input': function(e) {  
    _.each(e.currentTarget.files, function(file) {
      if(file.type != 'image/jpeg') {
        alert('Must upload a JPEG'); return;
      }
      Meteor.call('jobPhotoUploadInit', function(error, url) {
        console.log('Uploading photo to: ' + url);
        $.ajax({
          url: url, // the presigned URL
          type: 'PUT',
          // without processData: false jQuery makes a mess of the file
          // because it treats it as a string
          processData: false, 
          data: file,
          contentType: 'image/jpeg',
          success: function() {
            alert('Upload completed!');
          },
          error: function(xhr, status, error) {
            alert('Upload failed: ' + error);
          }
        });
      });
    });
  }
});
