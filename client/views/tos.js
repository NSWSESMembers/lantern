// bump this number whenever the TOS changes and people
// will have to accept it again
var currentVersion = 2;

Router.onBeforeAction(function() {
  if(!Meteor.user()) {
    this.next();
    return;
  }

  // if we're logged in but haven't accepted TOS...
  if(! Meteor.user().tos_read || Meteor.user().tos_read < currentVersion) {
    this.layout('layout', { data: { hideFooter: true }});
    this.render('tos');
  }
  else {
    this.next();
  }
});

Template.tos.events({
  'click button.decline': function(e, t) {
    t.$('button.accept,button.decline').attr('disabled', 'disabled');
    Meteor.call('delete_me', function() {
      Meteor.logout();
    });
  },
  'click button.accept': function(e, t) {
    Meteor.call('markTosRead', currentVersion);
  },
});
