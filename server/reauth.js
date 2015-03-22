// how often to re-check each users credentials
var authCheckInterval = 24 * 60 * 60 * 1000; // 24h

// how often to look for users to re-check
var authCheckTimer = 60 * 1000; // 1 min

// these values above should be good for up to 1000 users
// beyond that we need to run the auth check loop more often

Meteor.startup(function() {
  authCheckLoop();
});

var authCheckLoop = function() {
  var date = new Date(new Date().getTime() - authCheckInterval);
  var userToCheck = Meteor.users.findOne({
    "services.beacon": {$exists: true},
    "services.beacon.id": {$exists: true},
    "services.beacon.password": {$exists: true},
    $or: [
      {"services.beacon.checked": {$exists: false}}, // TODO: drop this once all users have checked field
      {"services.beacon.checked": {$lt: date}}
    ] 
  }, {sort: {"services.beacon.checked": 1}});
  
  // if there's no user to check then just schedule the next check
  if(!userToCheck) {
    Meteor.setTimeout(authCheckLoop, authCheckTimer);
    return;
  }
  
  var opts = {};
  if(process.env.NODE_ENV == 'development') {
    opts.development = true;
  }
  var beacon = new Beacon(opts);
  var serviceData = userToCheck.services.beacon;
  var user = serviceData.id;
  var pass = OAuthEncryption.isSealed(serviceData.password) ?
    OAuthEncryption.open(serviceData.password, userToCheck._id) : serviceData.password;
  beacon.login(user, pass, function(error, success) {
    if(error) {
      console.log("Failed to re-verify user "+userToCheck._id+" credentials: "+error);
    }
    else {
      if(!success) {
        console.log("User auth failed... setting expiry... "+userToCheck._id);
        authFailed(userToCheck);
      }
      else {
        // set the account's last checked stamp
        Meteor.users.update(userToCheck._id, {$set: {"services.beacon.checked": new Date()}});
      }
    }
    
    Meteor.setTimeout(authCheckLoop, authCheckTimer);
  });
  
};

// failed to auth this user, so send them a notification and set their account expiry
var authFailed = function(user) {
  var options = {
    sound: 'default',
    text: 'You have been logged out of Lantern and will stop receiving notifications if you do not log back in within 12 hours.',
  };
  Pusher.push(Devices.find({user: user._id}), options);

  Meteor.users.update(user._id, {
    $unset: {
      "services.beacon.password": 1,
      "services.beacon.checked": 1,
    },
    $set: {
      "services.beacon.expire": new Date(new Date().getTime() + expireInterval),
    }
  });
}

