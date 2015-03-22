require = Npm.require;

// ---------

var Request = require('request');
var htmlparser = require('htmlparser2');
var _ = require('underscore');

var Libbeacon = function(opts) {
  this.baseUrl = "https://beacon.ses.nsw.gov.au/";
  this.sessionCookieName = "PhaseThreeAuthCookie";
  this._userAgent = "libbeacon/0.1 (sdunster.com)";

  if(opts) {
    if(opts.development) {
      this.baseUrl = "https://trainbeacon.ses.nsw.gov.au/";
    }
    if(opts.userAgent) {
      this._userAgent = opts.userAgent;
    }
  }

  this._request = Request.defaults({
    rejectUnauthorized: false,
    timeout: 30000,
    headers: {
      'User-Agent': this._userAgent
    },
  });

}

Libbeacon.prototype._getLoginTokens = function(cb) {
  var self = this;
  var inLoginForm = false;
  var jar = this._request.jar();
  if(!_.isFunction(cb))
    throw new Error('Callback not specified');
 
  var parser = new htmlparser.Parser({
    onopentag: function(name, attribs) {
      if(name == "form" && attribs.id == "loginForm") {
        inLoginForm = true;
      }
      if(name == "input" && attribs.name == "__RequestVerificationToken" && inLoginForm) {
        var token = attribs.value;
        var cookie;
        jar.getCookies(self.baseUrl).forEach(function(c) {
          if(c.key == "__RequestVerificationToken")
            cookie = c.value;
        });
        if(cookie) {
          cb && cb(null, token, cookie);
        }
        else {
          cb && cb(new Error('No CSRF cookie returned'));
        }
      }
    },
    onclosetag: function(name) {
      inLoginForm = false;
    }
  });
 
  var req = this._request({
    url: this.baseUrl + "Account/Login",
    jar: jar
  });
 
  req.on('data', function(chunk) {
    parser.write(chunk);
  });
  req.on('end', function(chunk) {
    parser.end();
  });
  req.on('error', function(error) {
    cb && cb(error);
  });
}

Libbeacon.prototype._performLogin = function(username, password, token, cookie, cb) {
  var self = this;
  var jar = this._request.jar();
  if(!_.isFunction(cb))
    throw new Error('Callback not specified');
  var req = this._request({
    url: this.baseUrl + "Account/Login",
    headers: {
      'Cookie': '__RequestVerificationToken=' + cookie,
    },
    form: {
      "UserName": username,
      "Password": password,
      "__RequestVerificationToken": token
    },
    method: 'POST',
    jar: jar,
  }, function(error, response, body) {
    if(error) {
      cb && cb(new Error("Failed to authenticate: " + error));
      return;
    }
    if(body.indexOf("Incorrect username and/or password") > -1 ||
      body.indexOf("Your account was locked") > -1) {
      cb && cb(null, null); // auth failed so no error or cookie
      return;
    }
    var cookie;
    jar.getCookies(self.baseUrl).forEach(function(c) {
      if(c.key == self.sessionCookieName)
        cookie = c.value;
    });
    if(cookie) {
      cb && cb(null, cookie);
    }
    else {
      console.log(body);
      cb && cb(new Error("No session cookie returned"));
    }
  });
}
  
Libbeacon.prototype.login = function(username, password, cb) {
  var self = this;
  this.cookie = null;
  this.username = username;
  if(!_.isFunction(cb))
    throw new Error('Callback not specified');

  this._getLoginTokens(function(error, token, cookie) {
    if(error) {
      cb && cb(error)
      return;
    }

    self._performLogin(username, password, token, cookie, function(error, cookie) {
      if(error) {
        cb && cb(error);
        return;
      }

      if(!cookie) {
        cb && cb(null, false);
        return;
      }
      
      self.cookie = cookie;
      cb && cb(null, true);
    });
  });
}
    
Libbeacon.prototype.get = function(path, opts, cb) {
  if(!_.isFunction(cb))
    throw new Error('Callback not specified');
  var options = _.defaults(_.clone(opts) || {}, {
    headers: {}, // make sure headers is an empty obj if not passed
  });
  options.url = this.baseUrl + 'Api/v1/' + path;
  options.headers['Cookie'] = this.sessionCookieName + '=' + this.cookie;
  options.headers['User-Agent'] = this.userAgent;
  var req = this._request(options, function(error, response, body) {
    if(error) {
      cb && cb(error);
      return;
    }
    if(response.statusCode === 403) {
      cb && cb(new Error("unauthorized"));
      return
    }
    try {
      var data = JSON.parse(body);
    } catch(e) {
      cb && cb(e);
      return;
    }
    cb && cb(null, data);
  });
}

Libbeacon.prototype.getPagedResults = function(path, opts, cb) {
  if(!_.isFunction(cb))
    throw new Error('Callback not specified');
  this.getPagedResultsPage(path, opts, 1, cb);
}

Libbeacon.prototype.getPagedResultsPage = function(path, opts, page, cb) {
  // cb(error, finished, data)
  var self = this;
  var options = _.defaults(_.clone(opts) || {}, {
    qs: {}, // make sure qs is an empty obj if not passed
  });
  var totalItemsKey = 'TotalItems';
  if(options.totalItemsKey) {
    totalItemsKey = options.totalItemsKey;
    delete options.totalItemsKey;
  }
  options.qs['PageIndex'] = page;
  this.get(path, options, function(error, data) {
    if(error) {
      cb && cb(error);
      return;
    }
    var bad = false;
    bad = 'CurrentPage' in data ? bad : true;
    bad = 'PageSize' in data ? bad : true;
    bad = totalItemsKey in data ? bad : true;
    bad = 'Results' in data ? bad : true;
    if(bad) {
      cb && cb('Received data that does not contain page information');
      return;
    }
    if(data[totalItemsKey] > data['CurrentPage'] * data['PageSize']) {
      cb && cb(null, false, data['Results']);
      self.getPagedResultsPage(path, opts, page+1, cb);
    }
    else {
      cb && cb(null, true, data['Results']);
    }
  });
}

//module.exports = Libbeacon;

// -----------------

Beacon = function(opts) {
  this.libbeacon = new Libbeacon(opts);
  
  this.login = Meteor.wrapAsync(this.libbeacon.login, this.libbeacon);
  this.get = Meteor.wrapAsync(this.libbeacon.get, this.libbeacon);
  this.getPagedResults = Meteor.wrapAsync(this.libbeacon.getPagedResults, this.libbeacon);
}

