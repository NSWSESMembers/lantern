var Libbeacon = Npm.require("libbeacon");

Beacon = function(opts) {
  this.libbeacon = new Libbeacon(opts);
  
  this.login = Meteor.wrapAsync(this.libbeacon.login, this.libbeacon);
  this.get = Meteor.wrapAsync(this.libbeacon.get, this.libbeacon);
  this.getPagedResults = Meteor.wrapAsync(this.libbeacon.getPagedResults, this.libbeacon);
}

