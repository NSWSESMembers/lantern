
Meteor.loginWithBeacon = function(username, password, callback) {
  Accounts.callLoginMethod({
    methodArguments: [{
      beacon_user: username,
      password: password,
    }],
    userCallback: callback
  });
}
