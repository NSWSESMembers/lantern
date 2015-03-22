Router.route('/messages', {
  name: 'messages',
  template: 'messages',
});

Router.route('/messages/done', {
  name: 'messages.done',
  template: 'messages_done',
})

Router.route('/messages/:id', {
  name: 'messages.form',
  template: 'messages_form',
  data: function() {
    return Contacts.findOne({id: parseInt(this.params.id)});
  }
});

// reactively subscribe to contact groups for the locations the user is
// interested in. This automatically re-subscribes whenever the user changes
// their preferences since Meteor.user() will trigger reactive run
Tracker.autorun(function() {
  var user = Meteor.user();
  user && user.locations && Meteor.subscribe('contacts_locations', user.locations);
});

// keep track of number of characters in message field
var currentCharCount = new ReactiveVar(0);

// keep track of loading state. When loading we show loading spinner and
// disable the submit button to prevent duplicate messages being sent
var loading = new ReactiveVar(false);

Template.messages.helpers({
  contacts: function() {
    if(!Meteor.user()) return [];
    var locations = Meteor.user().locations || [];
    var contacts = Contacts.find({location: {$in: locations}});
    if(contacts.count() == 0) return false;
    return contacts;
  },
});

Template.messages_form.helpers({
  count: function() {
    return currentCharCount.get() + "/140";
  },
  tooLong: function() {
    return currentCharCount.get() > 140;
  },

  // disable button when user has entered < 5 or > 140 chars
  ok: function() {
    var val = currentCharCount.get();
    return val >= 5 && val <= 140;
  },
  loading: function() {
    return loading.get();
  }
});

Template.messages_form.events({
  // update character count
  'keyup textarea, change textarea': function(e, t) {
    var value = e.currentTarget.value;
    var count = value.trim().length;
    currentCharCount.set(count)
  },
  'submit form': function(e, t) {
    e.preventDefault();
    var contact = this.id;
    var text = t.$('textarea').val().trim();
    
    // very basic validation..
    if(text.length > 140) return;
    if(loading.get()) return;

    loading.set(true);
    
    Meteor.call('send_message', contact, text, function(error) {
      loading.set(false);
      if(error && error.error === "unauthorized") {
        alert("You are not allowed to send this message.");
        return;
      }
      if(error) console.log(error);
      Router.go('messages.done');
    });
  }
});
