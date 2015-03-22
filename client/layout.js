// configure global layout/router
Router.configure({
  layoutTemplate: 'layout',
  loadingTemplate: 'loading',
});

// this helper is used to color the status dot
Template.layout.helpers({
  status: function() {
    return Meteor.status().status;
  },
});

Template.layout.events({
  'click a.logout': function(e, t) {
    Meteor.logout();
  },
  'click header .status': function(e, t) {
    Meteor.reconnect();
  }
});
