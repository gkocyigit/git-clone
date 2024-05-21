#!/bin/bash

echo $(dirname $0)
cp $(dirname $0)/main.js main.js
exec node main.js "$@"
