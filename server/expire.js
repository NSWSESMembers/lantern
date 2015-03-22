// how long the user has to re-login
var expireInterval = 12 * 60 * 60 * 1000; // 12 hours

// how often to look for expired accounts
var expireCheckTimer = 60 * 1000; // 1 min

Meteor.startup(function() {
  expireCheckLoop();
});

var expireCheckLoop = function() {
  var date = new Date();

  // look for users whose accounts have expired
  var users = Meteor.users.find({
    "services.beacon": {$exists: true},
    "services.beacon.expire": {$exists: true},
    "services.beacon.expire": {$lt: date}
  });

  users.forEach(function(user) {
    console.log("Disabling user " + user._id);
    // disable the users devices (to stop push notifications)
    Devices.update({"user": user._id}, {
      $set: {
        "disabled": 1
      }
    }, {multi: true});
    
    // delete all of the users's resume tokens so they are logged out across all devices
    // clear the expired flag too
    Meteor.users.update({_id: user._id}, {
      $set: {
        "services.resume.loginTokens": []
      },
      $unset: {
        "services.beacon.expire": 1,
      }
    });
  });

  Meteor.setTimeout(expireCheckLoop, expireCheckTimer);
}

// upon successful beacon login make sure we:
// - clear the expire flag
// - mark the account as checked
// - re-activate any disabled devices
Accounts.onLogin(function(login) {
  if(login.type == "beacon") {
    Meteor.users.update({_id: login.user._id}, {
      $unset: {
        "services.beacon.expire": 1
      },
      $set: {
        "services.beacon.checked": new Date()
      }
    });
    
    Devices.update(
      {user: login.user._id, disabled: 1},
      {$unset: {disabled: 1}},
      {multi: true}
    );
  }
});
