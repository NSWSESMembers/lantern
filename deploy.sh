#!/bin/bash

# build into ../bundle
meteor build ../ --server=https://lantern.sdunster.com --directory

# nuke old version
rm -rf ../bundle-prev

# move live deploy out of the way
mv ../bundle-current ../bundle-prev # 

# move freshly built into place
mv ../bundle ../bundle-current

# install needed npm stuff
( cd ../bundle-current/programs/server && npm install )

