// if the user isn't logged in, intercept all views and show them the
// login screen instead
Router.onBeforeAction(function () {
  if (!Meteor.userId()) {
    this.layout('layout', { data: { hideFooter: true }});
    this.render('login');
  }
  else {
    this.next();
  }
});

// keep track of whether we're currently attempting a login (loading)
// when we are we show the loading spinner and disable the login button
var loading = new ReactiveVar(false);

Template.login.events({
  'click button.login, submit form': function(e, t) {
    e.preventDefault();
    var username = t.$('input.username').val()
    var password = t.$('input.password').val()
    if(loading.get()) return;
    loading.set(true);

    // if the user provided no password they're trying to login with a
    // kiosk code
    if(password.length == 0) {
      Meteor.loginWithKiosk(username, function(error) {
        loading.set(false);
        // TODO: do something better with this error
        if(error) alert(error);
      });
    }

    // else we assume they are doing a beacon login
    else {
      Meteor.loginWithBeacon(username, password, function(error) {
        loading.set(false);
        // TODO: do something better with this error
        if(error) alert(error);
      });
    }
  },

  // tapping on 'beacon' allows users to open an in-app browser to reset
  // their password or attempt to login to regular beacon
  'click a.beacon': function(e, t) {
    if(Meteor.isCordova) {
      e.preventDefault();
      window.open('http://beacon.ses.nsw.gov.au','_blank');
    }
  }
});

Template.login.helpers({
  'cordova': function() {
    return Meteor.isCordova;
  },
  'loading': function() {
    return loading.get();
  }
});
