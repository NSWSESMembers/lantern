// if the user has not got the assistant flag set on their User object but
// they DO have the tos_read flag then we run them through the setup assistant
// We make sure the tos_read flag is set so that the TOS gets shown first.

Router.onBeforeAction(function() {
  if(!Meteor.user()) {
    this.next();
    return;
  }

  // TODO: make sure the tos_read flag is checked the same way the tos view's
  // onBeforeAction checks it
  if(Meteor.user().tos_read && (! Meteor.user().assistant)) {
    this.layout('layout', { data: { hideFooter: true }});
    this.render('setupassistant');
  }
  else {
    this.next();
  }
});

Template.setupassistant.helpers({
  locations: function() {
    return Locations.find({}, {sort: {name: 1}});
  }
});

function getDevice() {
  return DeviceController.device();
}

Template.setupassistant_location.helpers({
  enabled: function() {
    var device = getDevice();
    if(!device) return;
    
    return device.locations && device.locations.indexOf(this.code) > -1;
  }
});

Template.setupassistant_location.events({
  'click a': function() {
    var device = getDevice();
    if(!device) return;
    Meteor.call('completeSetupassistant', device._id, this.code);
  }
});
