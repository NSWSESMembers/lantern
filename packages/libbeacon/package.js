Npm.depends({
  "htmlparser2": "3.7.3",
  "request": "2.40.0",
  "tough-cookie": "0.12.1",
  "underscore": "1.7.0"
});

Package.on_use(function (api) {
	api.export('Beacon');
	api.add_files('index.js', 'server');
});
