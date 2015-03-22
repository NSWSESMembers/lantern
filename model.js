Jobs = new Mongo.Collection("jobs");
Devices = new Mongo.Collection("devices");
Locations = new Mongo.Collection("locations");
Status = new Mongo.Collection("status");
Contacts = new Mongo.Collection("contacts");
People = new Mongo.Collection("people");

Status.get = function(key) {
  var doc = this.findOne({"key": key}, {sort: {"updated": -1}});
  if(!doc) return {};
  return doc;
}

Status.set = function(key, value) {
  var doc = this.upsert({
    "key": key
  }, {
    "key": key,
    "value": value,
    "updated": new Date(),
  });
}

// indexes
if(Meteor.isServer) {
  Meteor.startup(function() {
    People._ensureIndex({"sesId": 1});
  });
}
