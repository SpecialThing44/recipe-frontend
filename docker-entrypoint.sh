#!/bin/sh

# Runtime defaults keep local/dev behavior without baking values into image metadata.
: "${AUTH_AUTHORITY:=https://auth.spencers.cc/application/o/cooking-app-dev/}"
: "${AUTH_WELLKNOWN_ENDPOINT:=https://auth.spencers.cc/application/o/cooking-app-dev/.well-known/openid-configuration}"
: "${API_BASE_URL:=http://localhost:9000}"
: "${AUTH_CLIENT_ID:=}"
: "${ROUTE_PREFETCH_ENABLED:=false}"

# Replace environment variables in env.js
envsubst < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js

# Start nginx
exec nginx -g 'daemon off;'
