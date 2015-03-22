Accounts.addAutopublishFields({
  forLoggedInUser: ['services.beacon'],
  forOtherUsers: [
    'services.beacon.username',
    'services.beacon.id'
  ]
});

Accounts.registerLoginHandler(function(request) {
  if(!request.beacon_user) {
    return undefined;
  }

  check(request, {
    beacon_user: String,
    password: String
  });

  var beacon = new Beacon();
  var result = beacon.login(request.beacon_user, request.password);

  if(result != true) {
    return {
      error: new Meteor.Error(403, "Invalid credentials")
    }
  }

  var serviceData = {
    id: request.beacon_user,
    password: OAuthEncryption.seal(request.password),
  }

  return Accounts.updateOrCreateUserFromExternalService("beacon", serviceData, {});
});

