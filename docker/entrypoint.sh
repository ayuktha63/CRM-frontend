#!/bin/sh
set -e
envsubst '${CRM_API_URL} ${OPAC_API_URL} ${OPAC_APP_URL} ${CRM_APP_URL}' \
  < /usr/share/nginx/html/config.json.template \
  > /usr/share/nginx/html/config.json

# Inject the API preconnect hint into index.html so the browser opens the TLS
# connection while the JS bundle is still parsing (see index.html for why this
# can't be a static hardcoded value).
sed -i "s#__CRM_API_URL__#${CRM_API_URL}#g" /usr/share/nginx/html/index.html

exec nginx -g "daemon off;"
