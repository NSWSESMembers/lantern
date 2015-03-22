Npm.depends({
 "agentkeepalive": "0.2.2",
});

Package.on_use(function (api) {
	api.export('Agentkeepalive');
	api.add_files('index.js', 'server');
});
