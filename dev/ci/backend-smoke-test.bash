#!/bin/bash

echo "Smoke test: attempting to login as admin:admin"

# base64(admin:admin) -> YWRtaW46YWRtaW4=
response=$(curl 'http://0.0.0.0:8184/api/user/token' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Pragma: no-cache' \
  -H 'Referer: http://0.0.0.0:8184/' \
  -H 'Sec-GPC: 1' \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' \
  -H 'authorization: Basic YWRtaW46YWRtaW4=' \
  --insecure -v \
  -s -w "%{http_code}")

http_code="${response: -3}"

echo "HTTP code $http_code"

if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
  echo "Loging successful"
else
  echo "Logging in as admin:admin failed"
  exit 1
fi
