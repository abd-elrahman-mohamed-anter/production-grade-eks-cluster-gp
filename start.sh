#!/bin/sh

echo "Running database migrations..."
npm run db:push || echo "Migration failed, continuing..."

echo "Starting application..."
npm run start
