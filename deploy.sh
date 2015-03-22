#!/bin/bash

rm -rf ../bundle-prev
mv ../bundle ../bundle-prev
meteor build ../ --server=https://lantern.sdunster.com --directory

( cd ../bundle/programs/server && npm install )
cp start.sh ../bundle/

