
Meteor.loginWithKiosk = function(code, callback) {
  Accounts.callLoginMethod({
    methodArguments: [{
      kiosk_code: code,
    }],
    userCallback: callback
  });
}
