Npm.depends({
	'node-gcm': '0.9.12'
});

Package.on_use(function (api) {
	api.export('GCM');
	api.add_files('index.js', 'server');
});
