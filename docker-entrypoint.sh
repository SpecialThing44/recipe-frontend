#!/bin/sh

# Replace environment variables in env.js
envsubst < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js

# Start nginx
exec nginx -g 'daemon off;'
