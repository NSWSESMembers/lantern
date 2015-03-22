// enabling debug below will monkey patch console.log on the clients
// and configure them such that all log messages normally bound for
// console.log will in addition be sent to the server and printed
// using the server's console.log

var debug = false;
var oldlog;

if(debug) {
  Meteor.startup(function() {
    Tracker.autorun(function() {

      // user must be logged in for Meteor.call('log', ...) to work
      if(Meteor.loggingIn()) return;

      // device must also be registered
      if(Meteor.user() && DeviceController.registered() && ! oldlog) {
        oldlog = console.log;
        console.log = function( /* arugments */ ) {
          oldlog.apply(this, arguments);
          Meteor.call('log', DeviceController.device()._id,
            Array.prototype.join.apply(arguments));
        }
      }
      
      // swap back in the old log if the user logs out/de-registers
      else if(oldlog) {
        console.log = oldlog;
        oldlog = null;
      }
    });
  });
}
