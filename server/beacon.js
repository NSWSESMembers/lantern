
var sendAdminEmail = function(subject, text) {
  Email.send({
    to: Constants.adminEmails,
    from: Constants.emailFrom,
    subject: subject,
    text: text,
  });
}

var jobSyncPool = new Agentkeepalive.HttpsAgent({
  maxSockets: 2, // we only need one connection, but setting it to 1 doesn't seem to work
  //keepAliveMsecs: 1000 * 10, // 10s
});
jobSyncPool.createSocket = function (req, options) {
  var result = Agentkeepalive.HttpsAgent.prototype.createSocket.call(this, req, options);
  result.on('error', function(e) {
    console.log("error job sync: " + e);
  });
  return result;
}

var produceNewNotification = function(job) {
    var options = {}
    
    var icon = '';
    var description = job.type + ' @ ' + job.address;
    if(job.rescue) {
      icon = '\uD83D\uDEA8';
      options.sound = 'new_rescue';
    }
    else {
      if(job.type === "Support") {
        icon = '\u26A0\uFE0F';
        options.sound = 'new_support';
      }
      else {
        icon = '\u2614\uFE0F';
        options.sound = 'new_job';
      }
    }
    
    if(job.situation) description += ' - ' + job.situation;
    options.text = icon + job.location + ': NEW ' + description;

    // if we're in development mode append [TEST ONLY] to all messages
    if(process.env.NODE_ENV == 'development') options.text = '[TEST] ' + options.text;

    options.payload = { job_id: job.id };
    return options;
}

var produceCancelNotification = function(job) {
    var options = {}
    options.sound = 'ack';
    
    var description = job.type + ' @ ' + job.address;
    options.text = job.location + ': CANCEL ' + description;

    // if we're in development mode append [TEST ONLY] to all messages
    if(process.env.NODE_ENV == 'development') options.text = '[TEST] ' + options.text;

    options.payload = { job_id: job.id };
    return options;
}

var produceAckNotification = function(job) {
    var options = {}
    options.sound = 'ack';
    
    var description = job.type + ' @ ' + job.address;
    options.text = job.location + ': ACK ' + description + ' - ' + job.acknowledgedBy;

    // if we're in development mode append [TEST ONLY] to all messages
    if(process.env.NODE_ENV == 'development') options.text = '[TEST] ' + options.text;

    options.payload = { job_id: job.id };
    return options;
}

var convertJob = function(job) {
  var data = {
    id: job['Id'],
    identifier: job['Identifier'],
    type: job['Type'],
    created: job['CreatedOn'],
    modified: job['LastModified'],
  }
  // we can just use type instead
  //if(job['JobRescueType']) data.rescueType = job['JobRescueType']['Name']
  data.status = null;
  if(job['JobStatusType']) data.status = job['JobStatusType']['Name']
  data.location = null;
  if(job['EntityAssignedTo']) {
    data.location = job['EntityAssignedTo']['Code']
    if(job['EntityAssignedTo']['ParentEntity']) data.region = job['EntityAssignedTo']['ParentEntity']['Code'];
  }
  data.address = null;
  data.latitude = null;
  data.longitude = null;
  data.extraAddress = null;
  if(job['Address']) {
    data.address = job['Address']['PrettyAddress'];
    data.latitude = job['Address']['Latitude'];
    data.longitude = job['Address']['Longitude'];
    if(job['Address']['AdditionalAddressInfo'])
      data.extraAddress = job['Address']['AdditionalAddressInfo'];
  }
  data.acknowledged = false;
  if(job['JobStatusTypeHistory']) {
    var lastStatus = 0;
    _.each(job['JobStatusTypeHistory'], function(change) {
      if(change['Type'] == Constants.jobStatusTypes.acknowledged &&
        lastStatus != Constants.jobStatusTypes.acknowledged) {
        data.acknowledged = true;
        if(change['CreatedBy']) data.acknowledgedBy = change['CreatedBy']['FullName']
      }
      lastStatus = change['Type'];
   });
  }
  if(job['Tags']) {
    data.tags = _.map(job['Tags'], function(tag) {
      var type = null;
      if(tag['TagGroupId'] in Constants.tagTypes)
        type = Constants.tagTypes[tag['TagGroupId']];
      else console.log("Unknown tag group! " + tag['TagGroupId']);
      return {
        'type': type,
        'category': tag['TagGroupId'],
        'name': tag['Name']
      }
    });
  }
  data.permissionToEnter = false;
  if(job['PermissionToEnterPremises']) data.permissionToEnter = true;
  data.howToEnter = '';
  if(job['HowToEnterPremises']) data.howToEnter = job['HowToEnterPremises'];
  data.situation = '';
  if(job['SituationOnScene']) data.situation = job['SituationOnScene']
  data.rescue = false;
  data.priority = false;
  data.contact = null;
  data.contactNumber = null;
  if((job['ContactFirstName'] || job['ContactLastName']) && job['ContactPhoneNumber']) {
    data.contact = (job['ContactFirstName'] || '') + ' ' + (job['ContactLastName'] || '');
    data.contactNumber = job['ContactPhoneNumber'];
  }
  else if((job['CallerFirstName'] || job['CallerLastName']) && job['CallerPhoneNumber']) {
    data.contact = (job['CallerFirstName'] || '') + ' ' + (job['CallerLastName'] || '');
    data.contactNumber = job['CallerPhoneNumber'];
  }
  if('JobPriorityType' in job && job['JobPriorityType']['Id'] == Constants.jobPriorityTypes.rescue) {
    data.rescue = true;
  }
  else if('JobPriorityType' in job && job['JobPriorityType']['Id'] == Constants.jobPriorityTypes.priority) {
    data.priority = true;
  }
  return data;
}

var beaconTimestamp = function(date) {
  // 2014-11-15T00%3A00%3A00%2B11%3A00
  var month = date.getUTCMonth() + 1;
  var day = date.getUTCDate();
  var hours = date.getUTCHours();
  var minutes = date.getUTCMinutes();
  if(month < 10) month = "0" + month;
  if(day < 10) day = "0" + day;
  if(hours < 10) hours = "0" + hours;
  if(minutes < 10) minutes = "0" + minutes;

  return date.getUTCFullYear() + '-' + month + '-' + day + 'T' +
    hours + ":" + minutes + ":" + seconds + "+0:00";
}

var syncJobs = function(beacon, count, timeRange, cb) {
  var opts = { qs: {"Q": "", "SortField": "JobReceived", "SortOrder": "desc" }}

  // if timeRange is zero then we are requesting _ALL_
  if(timeRange > 0) {
    opts.qs["StartDate"] = new Date(new Date().getTime() - timeRange)
    opts.qs["EndDate"] = new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 365)); // now + 1 year
  }
  
  if(count == 0) {
    beacon.getPagedResults('Jobs/Search', opts, function(error, finished, results) {
      if(error) {
        cb && cb(error);
        return;
      }
      processData(results);
      if(finished) {
        done();
      }
    });
  }
  else {
    opts.qs['PageSize'] = count;
    opts.agent = jobSyncPool;
    beacon.get('Jobs/Search', opts, function(error, data) {
      if(error) {
        cb && cb(error);
        return;
      }
      processData(data["Results"]);
      done();
    });
  }

  var processData = function(data) {
    for(i in data) {
      if(!'Id' in data[i]) {
        console.log("Skipping invalid job: "+data[i]);
        continue;
      }
      upsertJob(data[i]);
    }
  }

  var done = function() {
    cb && cb();
  }
}

var upsertJob = function(data) {
  var job = convertJob(data);
  var oldjob = Jobs.findOne({id: job.id});
  if(oldjob) {
    // update
    jobUpdated(oldjob, job);
    Jobs.update({_id: oldjob._id}, job);
  }
  else {
    console.log("Insert job: #" + job.identifier);
    jobUpdated({}, job);
    // upsert just in case this job got inserted between here and the findOne above
    Jobs.upsert({id: job.id}, job);
  }
}

var jobUpdated = function(oldjob, newjob) {

  // look for new jobs
  if(!oldjob.id) {
    console.log("New job #" + newjob.identifier);
    var options = produceNewNotification(newjob);
    Pusher.push(Devices.find({locations: newjob.location, disabled: {$exists: false}}), options);
  }

  // look for jobs that have been acknowledged
  if(!oldjob.acknowledged && newjob.acknowledged) {
    console.log("Job acknowledged #" + newjob.identifier);
    var options = produceAckNotification(newjob);
    Pusher.push(Devices.find({locations: newjob.location, disabled: {$exists: false}}), options);
  }

  // look for jobs that have been cancelled
  if(oldjob.status != "Cancelled" && newjob.status === "Cancelled") {
    console.log("Job cancelled #" + newjob.identifier);
    var options = produceCancelNotification(newjob);
    Pusher.push(Devices.find({locations: newjob.location, disabled: {$exists: false}}), options);
  }
}

var loadJob = function(beacon, id) {
  beacon.get(
    '/Jobs/'+id,
    { agent: remainderPool }, 
    function(error, data) {
      if(error) {
        cb && cb(error);
        return;
      }
      insertJob(data);
    }
  );
}

var syncLocations = function(beacon, cb) {
  var addedLocations = [];
  var updatedLocations = [];
  var removedLocations = [];
  var ids = {};

  beacon.getPagedResults(
    'Entities',
    {},
    function(error, finished, results) {
      if(error) {
        cb && cb(error);
        return;
      }

      for(var i in results) {
        var location = results[i];
        var doc = Locations.findOne({id: location['Id']});
        var data = {
          id: location['Id'],
          code: location['Code'],
          name: location['Name']
        }
        ids[data.id] = true;
        if(!doc) {
          addedLocations.push(data);
          var id = Locations.insert(data);
        }
        else {
          if(doc['code'] != data['code'] || doc['name'] != data['name']) {
            updatedLocations.push(data);
            Locations.update({id: doc['id']}, data);
          }
        }
      }

      if(finished) {
        // now look for locations to delete
        var locationsToDelete = [];
        Locations.find({},{fields:{id:1}}).forEach(function(location) {
          if(! (location.id in ids)) {
            removedLocations.push(Locations.findOne({_id: location._id}));
            locationsToDelete.push(location._id);
          }
        });
        
        // nuke 'em
        Locations.remove({_id: {$in: locationsToDelete}});
        
        // send email with details on added/updated locations
        if(addedLocations.length || updatedLocations.length || removedLocations.length) {
          sendAdminEmail(
            "Lantern: locations updated",
            "Added:\n\n" + JSON.stringify(addedLocations, null, 2) +
            "\n\nUpdated:\n\n" + JSON.stringify(updatedLocations, null, 2) + 
            "\n\nRemoved:\n\n" + JSON.stringify(removedLocations, null, 2) + "\n\n"
          );
        }
        cb && cb();
      }
    }
  );
}

var syncPeople = function(beacon, cb) {
  var addedPeople = [];
  var updatedPeople = [];
  var removedPeople = [];
  var ids = {};

  beacon.getPagedResults(
    'People/Search',
    { qs: { "PageSize": 200 }, totalItemsKey: 'TotalPeople' },
    function(error, finished, results) {
      if(error) {
        cb && cb(error);
        return;
      }

      for(var i in results) {
        var person = results[i];
        var doc = People.findOne({id: person['Id']});

        // skip people without ID numbers (they're probably external people)
        if(person['RegistrationNumber']) {
          var data = {
            id: person['Id'],
            location: person['Entity']['Code'],
            name: person['FullName'],
            sesId: person['RegistrationNumber']
          }
          ids[data.id] = true;
          if(!doc) {
            addedPeople.push(data);
            var id = People.insert(data);
          }
          else {
            if(doc['location'] != data['location'] || doc['name'] != data['name']) {
              updatedPeople.push(data);
              People.update({id: doc['id']}, data);
            }
          }
        }
      }

      if(finished) {
        // now look for people to delete
        var peopleToDelete = [];
        People.find({},{fields:{id:1}}).forEach(function(person) {
          if(! (person.id in ids)) {
            removedPeople.push(People.findOne({_id: person._id}));
            peopleToDelete.push(person._id);
          }
        });
        
        // nuke 'em
        People.remove({_id: {$in: peopleToDelete}});
        
        // send email with details on added/updated people
        if(addedPeople.length || updatedPeople.length || removedPeople.length) {
          sendAdminEmail(
            "Lantern: people updated",
            "Added:\n\n" + JSON.stringify(addedPeople, null, 2) +
            "\n\nUpdated:\n\n" + JSON.stringify(updatedPeople, null, 2) + 
            "\n\nRemoved:\n\n" + JSON.stringify(removedPeople, null, 2) + "\n\n"
          );
        }
        cb && cb();
      }
    }
  );
}

var syncContacts = function(beacon, cb) {
  var ids = {};

  beacon.getPagedResults('ContactGroups/Search', { qs: { "PageSize": 200 }}, function(error, finished, results) {
    if(error) {
      cb && cb(error);
      return;
    }

    for(var i in results) {
      var group = results[i];
      var data = {
        id: group['Id'],
        location: group['Entity']['Code'],
        name: group['Name'],
      }
      ids[data.id] = true;
      Contacts.upsert({id: group['Id']}, data);
    }

    if(finished) {
      // now look for contacts to delete
      var toDelete = [];
      Contacts.find({}, {fields:{id:1}}).forEach(function(contact) {
        if(! (contact.id in ids)) {
          toDelete.push(contact._id);
        }
      });
      Contacts.remove({_id: {$in: toDelete}});
      
      cb && cb();
    }
  });
}

BeaconController = {
  beacon: null,
  syncers: {},
  verbose: false,
  sendBeaconMessage: function(user, pass, message, contact, cb) {
    var opts = {};
    if(process.env.NODE_ENV == 'development') {
      opts.development = true;
    }
    var beacon = new Beacon(opts);
    beacon.login(user, pass, function(error, success) {
      if(error) {
        cb(new Meteor.Error("Authentication failed: "+error))
        return;
      }

      if(!success) {
        cb(new Meteor.Error("Authentication failed: stored credentials invalid"))
        return;
      }

      beacon.get('Messages',
        {
          method: "POST",
          form: { "MessageText": message, "ContactGroupIds": contact }
        },
        function(error, data) {
          if(error) {
            cb && cb(error);
            return;
          }
          console.log("Sent message!");
          cb && cb();
        }
      );
    });
  },
  acknowledgeJob: function(user, pass, jobId, cb) {
    var opts = {};
    if(process.env.NODE_ENV == 'development') {
      opts.development = true;
    }
    var beacon = new Beacon(opts);
    beacon.login(user, pass, function(error, success) {
      if(error) {
        cb(new Meteor.Error("Authentication failed: "+error))
        return;
      }

      if(!success) {
        cb(new Meteor.Error("Authentication failed: stored credentials invalid"))
        return;
      }

      beacon.get('Jobs/'+jobId+'/Acknowledge',
        {
          method: "POST",
        },
        function(error, data) {
          if(error) {
            cb && cb(error);
            return;
          }
          console.log("Acknowledged job!");
          Jobs.update({id: jobId}, {$set: {acknowledged: true, status: "Acknowledged"}});
          cb && cb();
        }
      );
    });
  }
}

var Syncer = function(opts) {
  this._currentTimer = null;
  this.options = _.defaults(opts || {}, {
    startImmediately: false, 
    verbose: false,
  });
  if(BeaconController.verbose) this.options.verbose = true;
  if(!_.isFunction(this.options.sync)) {
    throw new Meteor.Error("sync option not defined or not function");
  }
  if((!this.options.minInterval || !this.options.maxInterval) && !this.options.interval) {
    throw new Meteor.Error("interval or minInterval and maxInterval must be specified");
  }
  if(this.options.startImmediately) {
    this._sync();
  }
  else {
    this._resetTimer();
  }

  if(this.options.id) {
    BeaconController.syncers[this.options.id] = this;
  }
}

Syncer.prototype._sync = function(cb) {
  var self = this;
  var start = new Date().getTime();
  this.options.verbose && console.log("Starting syncer "+self.options.id);
  Status.set('syncStatus-'+self.options.id, 'in progress');
  this.options.sync.call(self, function(error) {
    var end = new Date().getTime();
    var time = end - start;
    if(error) {
      Status.set('syncStatus-'+self.options.id, JSON.stringify(error));
      console.log("Syncer error "+self.options.id+": "+error+"("+time+"ms)");
      if(self.options.errorInterval) {
        self._schedule(self.options.errorInterval);
      }
      else {
        self._resetTimer();
      }
    }
    else {
      Status.set('syncStatus-'+self.options.id, 'success');
      self.options.verbose && console.log("Sync done "+self.options.id+" ("+time+"ms)");
      self._resetTimer();
    }
    Status.set('syncTime-'+self.options.id, time);
    cb && cb(error);
  });
}

Syncer.prototype._cancelTimer = function() {
  if(this._currentTimer) {
    Meteor.clearTimeout(this._currentTimer);
    this._currentTimer = null;
  }
}

Syncer.prototype.syncNow = function(cb) {
  this._cancelTimer();
  this._sync(function(error) {
    cb && cb(error)
  });
}

Syncer.prototype._resetTimer = function() {
  this._cancelTimer();
  
  var timeout;
  if(this.options.minInterval && this.options.maxInterval) {
    var min = this.options.minInterval;
    var max = this.options.maxInterval;
    timeout = Math.floor(Math.random()*(max-min+1)+min);
  }
  else {
    timeout = this.options.interval;
  }
  this._schedule(timeout);
}

Syncer.prototype._schedule = function(timeout) {
  var self = this;
  this._currentTimer = Meteor.setTimeout(function() {
    self._currentTimer = null;
    self._sync();
  }, timeout);
}


var startSyncers = function(beacon) {
  // contacts
  new Syncer({
    id: 'contact',
    minInterval: 1000 * 60 * 30,
    maxInterval: 1000 * 60 * 60,
    sync: function(cb) {
      syncContacts(beacon, function(error) {
        cb(error);
      });
    }
  });
  
  // locations
  new Syncer({
    id: 'location',
    minInterval: 1000 * 60 * 30,
    maxInterval: 1000 * 60 * 60,
    sync: function(cb) {
      syncLocations(beacon, function(error) {
        cb(error);
      });
    }
  });

  // people
  new Syncer({
    id: 'people',
    minInterval: 1000 * 60 * 30,
    maxInterval: 1000 * 60 * 60,
    sync: function(cb) {
      syncPeople(beacon, function(error) {
        cb(error);
      });
    }
  });
  
  new Syncer({
    id: 'job1',
    interval: 1000, // 1s
    sync: function(cb) {
      syncJobs(beacon, 20, 1000 * 60 * 5, function(error) {
        cb(error);
      });
    }
  });

  new Syncer({
    id: 'job2',
    minInterval: 1000 * 20, // 20s
    maxInterval: 1000 * 30, // 30s
    sync: function(cb) {
      syncJobs(beacon, 100, 1000 * 60 * 60, function(error) {
        cb(error);
      });
    }
  });

  new Syncer({
    id: 'job3',
    minInterval: 1000 * 60 * 4, // 4m
    maxInterval: 1000 * 60 * 5, // 5m
    sync: function(cb) {
      syncJobs(beacon, 0, 1000 * 60 * 60 * 12, function(error) {
        cb(error);
      });
    }
  });
  
  new Syncer({
    id: 'job4',
    minInterval: 1000 * 60 * 60, // 1h
    maxInterval: 1000 * 60 * 70, // 1h + 10m
    sync: function(cb) {
      syncJobs(beacon, 0, 1000 * 60 * 60 * 24 * 30, function(error) {
        cb(error);
      });
    }
  });

  // Sync _ALL_ jobs
  new Syncer({
    id: 'job5',
    minInterval: 1000 * 60 * 60 * 22, // 22h 
    maxInterval: 1000 * 60 * 60 * 24, // 24h
    sync: function(cb) {
      syncJobs(beacon, 0, 0, function(error) {
        cb(error);
      });
    }
  });
}

Meteor.startup(function () {
  var opts = {};
  if(process.env.NODE_ENV == 'development') {
    opts.development = true;
  }
  if(!process.env.BEACON_USER) {
    console.log("Unable to load BEACON_USER from env");
  }
  if(!process.env.BEACON_PASS) {
    console.log("Unable to load BEACON_PASS from env");
  }

  var beacon = BeaconController.beacon = new Beacon(opts);
  console.log("Using beacon: " + BeaconController.beacon.libbeacon.baseUrl);
  beacon.login(process.env.BEACON_USER, process.env.BEACON_PASS, function(error, success) {
    if(error) {
      console.log(error);
      return;
    }

    if(!success) {
      console.log("Abort: Invalid beacon credentials");
      return;
    }
    
    if(Constants.disableSync) return;
    startSyncers(beacon);
  });
});

