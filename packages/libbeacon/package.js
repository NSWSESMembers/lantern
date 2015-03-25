Npm.depends({
  "libbeacon": "0.1.0",
});

Package.on_use(function (api) {
	api.export('Beacon');
	api.add_files('index.js', 'server');
});
