// the re-auth view is shown whenever a user's account has been set to expire
// because their password is no longer valid. If users do not return the app,
// and fix the problem within this view they will be logged out (and their
// devices disabled) until they log back in again.
// This is to prevent deactivated/locked beacon accounts from continuing to
// have access to beacon data through lantern

Router.onBeforeAction(function() {
  var user = Meteor.user();

  // if no user is logged in we can skip this check
  if(!user) {
    this.next();
    return;
  }

  // if we're logged in, but the account is set to expire then
  // direct user to re-authenticate
  if(user.services.beacon && user.services.beacon.expire) {
    this.layout('layout', { data: { hideFooter: true }});
    this.render('reauth');
  }
  else {
    this.next();
  }
});

// keep track of loading state to show loading spinner
var loading = new ReactiveVar(false);

Template.reauth.events({
  'click button.logout': function(e, t) {
    Meteor.logout();
  },
  'click button.login, submit form': function(e, t) {
    e.preventDefault();
    var username = Meteor.user().services.beacon.id;
    var password = t.$('input.password').val()
    if(loading.get()) return;
    loading.set(true);

    // we simply attempt to log back in as per normal. The regular login
    // function here will automatically clear the expired flag
    Meteor.loginWithBeacon(username, password, function(error) {
      loading.set(false);
      // TODO: do something better with this error
      if(error) alert(error);
    });
  },
  'click a.beacon': function(e, t) {
    if(Meteor.isCordova) {
      e.preventDefault();
      window.open('http://beacon.ses.nsw.gov.au','_blank');
    }
  }
});

Template.reauth.helpers({
  'loading': function() {
    return loading.get();
  }
});
