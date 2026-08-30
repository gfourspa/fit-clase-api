#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/typeorm/cli.js migration:run -d dist/src/database/data-source.js

echo "Starting application..."
exec node dist/main.js
