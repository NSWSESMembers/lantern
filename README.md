# Lantern
Mobile beacon companion

## Installation
```bash
curl https://install.meteor.com/ | sh
git clone https://github.com/sdunster/lantern.git
```

## Run dev server
Put the following in a `vars.sh` file. APNS and GCM vars are optional.
```bash
export ENCRYPTION_KEY=''
export BEACON_USERNAME='user'
export BEACON_PASSWORD='pass'
export APNS_CERT='/path/to/apns.cert'
export APNS_KEY='/path/to/apns.key'
export GCM_SENDER_KEY='google_cloud_messaging_api_key'
```
The encryption key should be 16 bytes, encoded in base64. To generate a key:
```bash
~/.meteor/tools/latest/bin/node -e 'console.log(require("crypto").randomBytes(16).toString("base64"))'
```
Now load the vars and start the server.
```bash
. vars.sh
cd lantern && meteor
```

Now open http://localhost:3000 in your browser.

## Build phone apps
Coming soon. Check [Makefile](Makefile) and
[Meteor Cordova Integration](https://github.com/meteor/meteor/wiki/Meteor-Cordova-Phonegap-integration) for info.

## License
[MIT](LICENSE)
