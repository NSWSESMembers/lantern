var existingConstants;
try {
  existingConstants = Constants;
} catch(e) {
  existingConstants = {}
}

Constants = _.extend(existingConstants, {

  // disable all beacon syncing
  disableSync: false,

  // disable all push notifications
  disablePush: false,
  
  // job constants
  jobStatusTypes: {
    new: 1,
    acknowledged: 2,
    complete: 6,
  },
  jobPriorityTypes: {
    rescue: 1,
    priority: 2,
    general: 3,
  },

  // who to send admin notification emails to
  adminEmails: ['lantern@sdunster.com'],
  
  // who they come from
  emailFrom: 'lantern@sdunster.com',
  
  // push notification sounds
  sounds: {
  
    // ios sounds must be placed in the bundle and include full file name
    ios: {
      new_rescue: 'siren1.aiff',
      new_support: 'tone3.caf',
      new_job: 'notification1.caf',
      ack: 'tone4.caf',
    },
    
    // android sounds must be compiled into resources and should be filename without extension
    android: {
      new_rescue: 'siren1',
      new_support: 'tone3',
      new_job: 'notification1',
      ack: 'tone4',
    }
  },
  
  // mapping of Tag Group IDs to type (used to display tag icon & colour)
  tagTypes: {
    5:  'damage',
    6:  'damage',
    7:  'hazard',
    8:  'hazard',
    9:  'hazard',
    10: 'property',
    11: 'property',
    12: 'property',
    13: 'property',
    14: 'task',
    15: 'task',
    16: 'task',
    18: 'aviation',
    19: 'special-needs',
    20: 'flood-rescue',
    25: 'flood-misc',
    26: 'animal',
  }
})

