#!/bin/bash

cp $(dirname $0)/main.js main.js
exec node main.js "$@"
