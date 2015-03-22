// unused codes expire after 1 hour
var expiryTime = 60 * 60 * 1000; 

Accounts.addAutopublishFields({
  forLoggedInUser: ['services.kiosk'],
  forOtherUsers: [
    'services.kiosk.creator',
    'services.kiosk.creation',
    'services.kiosk.name'
  ]
});

Accounts.registerLoginHandler(function(request) {
  if(!request.kiosk_code) {
    return undefined;
  }

  check(request, {
    kiosk_code: String
  });

  var user = Meteor.users.findOne({"services.kiosk.code": request.kiosk_code});

  if(!user) {
    return {
      error: new Meteor.Error(403, "Invalid credentials")
    }
  }

  // remove the code to prevent further use
  Meteor.users.update({_id: user._id}, {$unset: {"services.kiosk.code": ""}});

  return {
    type: "kiosk",
    userId: user._id
  }
});

// every 60 seconds clean up unused expired accounts
Meteor.startup(function() {
  Meteor.setInterval(function() {
    var expireDate = new Date(new Date().getTime() - expiryTime);
    var numRemoved = Meteor.users.remove({"services.kiosk.code": {$exists: true}, "services.kiosk.creation": {$lte: expireDate}});
    //console.log("Cleaned up " + numRemoved + " expired kiosk codes");
  }, 60 * 1000);
});
