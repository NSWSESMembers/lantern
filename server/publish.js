Meteor.publish('devices_mine', function() {
  if(!this.userId)
    return [];
  return Devices.find({user: this.userId});
});

Meteor.publish('devices_all', function() {
  if(!this.userId)
    return [];
  return Devices.find({});
});

Meteor.publish('locations', function() {
  if(!this.userId)
    return [];
  return Locations.find({});
});

Meteor.publish('contacts_all', function() {
  if(!this.userId)
    return [];
  return Contacts.find({});
});

Meteor.publish('contacts_locations', function(locations) {
  check(locations, [String]);
  if(!this.userId)
    return [];
  return Contacts.find({location: {$in: locations}});
});

var closedStatuses = ["Complete", "Finalised", "Referred", "Cancelled", "Rejected"];
Meteor.publish('jobs_locations', function(locations) {
  check(locations, [String]);
  if(!this.userId)
    return [];
  return Jobs.find({status: {$nin: closedStatuses}, location: {$in: locations}}, {limit:50, sort: {created: -1}});
});

Meteor.publish('jobs_job', function(id) {
  if(!this.userId)
    return [];
  return Jobs.find({id: id});
});

Meteor.publish('status', function(keys) {
  var keys_array = [].concat(keys);
  if(keys) {
    return Status.find({key: {$in: keys_array}});
  }
  return Status.find({});
});

// publish extra stuff for user
Meteor.publish(null, function() {
  var fields = ['locations', 'tos_read', 'assistant', 'super',
    'services.beacon.id', 'services.beacon.expire'];

  var mongoFields = {};
  _.each(fields, function(field) {
    mongoFields[field] = 1;
  });

  return Meteor.users.find({_id: this.userId}, {fields: mongoFields});
});

