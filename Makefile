all:	clean_cordova cordova open_xcode

clean_cordova:
	rm -rf .meteor/local/cordova-build

cordova:
	meteor build ../lantern-build --server=https://lantern.sdunster.com

open_xcode:
	open ../lantern-build/ios/project/lantern.xcodeproj
	@echo "Don't forget to:"
	@echo "- add image assets and configure launch image and icons"
	@echo "- set bundle identifier"
	@echo "- set version"
	@echo "- make iPhone only"
	@echo "- remove splash screen plugin from config.xml"
	@echo "- remove any references to icons from info.plist because otherwise App Store shows Meteor icons"

link:
	#cd packages/libbeacon/.build.libbeacon/npm && npm link libbeacon
	cd .meteor/local/build/programs/server/npm/libbeacon && npm link libbeacon
