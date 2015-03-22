Npm.depends({
	'apn': '1.6.2'
});

Package.on_use(function (api) {
	api.export('Apn');
	api.add_files('index.js', 'server');
});
