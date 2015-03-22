// reactively subscribe to active jobs for the locations the user is
// iinterested in - this should re-run whenever the user changes their
// location preferences (since that will trigger a change to the Meteor.user()
// reactive var
Tracker.autorun(function() {
  var user = Meteor.user();
  user && user.locations && Meteor.subscribe('jobs_locations', user.locations);
});

Router.route('/', {
  name: 'jobs',
  template: 'jobs'
});

// smart users can use this to load any job by ID - but we don't care
Router.route('/job/:id', {
  name: 'jobs.job',
  template: 'jobs_job',
  waitOn: function () {
    return Meteor.subscribe('jobs_job', parseInt(this.params.id));
  },
  data: function() {
    return Jobs.findOne({id: parseInt(this.params.id)})
  }
});

// ignore jobs that have any of these statuses
var closedStatuses = ["Complete", "Finalised", "Referred", "Cancelled", "Rejected"];

Template.jobs.helpers({
  // we have to re-filter uninteresting jobs out of here in case we have some
  // from other subscriptions in our local minimongo
  jobs: function() {
    if(!Meteor.user()) return false;
    var locations = Meteor.user().locations || [];
    var jobs = Jobs.find({status: {$nin: closedStatuses}, location: {$in: locations}}, {limit:50, sort: {created: -1}});
    if(jobs.count() == 0) return false;
    return jobs;
  },
  class: function() {
    if(this.rescue)
      return "rescue";
    if(this.priority == "Priority")
      return "priority";
  }
});

var dpr = function() {
  return window.devicePixelRatio || 1;
}

Template.jobs_job.events({

  // the following are handled as regular <a> unless we're running
  // in Cordova. In Cordova we have to trigger a system URL open
  'click a.beacon': function(e, t) {
    if(Meteor.isCordova) {
      e.preventDefault();
      window.open('https://beacon.ses.nsw.gov.au/Jobs/' + this.id,'_system');
    }
  },
  'click a.nav': function(e, t) {
    if(Meteor.isCordova) {
      e.preventDefault();
      window.open('https://maps.google.com?q=' + this.address, '_system');
    }
  },

  'click .ack': function(e, t) {
    e.preventDefault();
    if(confirm("Are you sure you want to acknowledge this job?")) {
      Meteor.call('acknowledgeJob', this.id);
    }
  }
});

Template.jobs_job.helpers({
  // do some magic here so that retina (2x) devices show higher-quality images
  img_width: function() {
    return Math.floor(window.innerWidth / 2);
  },
  img_height: function() {
    return Math.floor(window.innerWidth / 2);
  },
  src_width: function() {
    return Math.floor(window.innerWidth / 2 * dpr());
  },
  src_height: function() {
    return Math.floor(window.innerWidth / 2 * dpr());
  },
  scale: dpr,

  // useful for viewing entire job model
  json: function() {
    return JSON.stringify(this, null, "  ");
  },
  cordova: function() {
    return Meteor.isCordova;
  },
  beacon_url: function() {
    return 'https://beacon.ses.nsw.gov.au/Jobs/' + this.id;
  },
  tag_class: function() {
    if(this.type)
      return 'tag-'+this.type;
    return '';
  },
  class: function() {
    if(this.rescue)
      return "rescue";
    if(this.priority == "Priority")
      return "priority";
  }
});
