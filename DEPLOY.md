# Serving VYRA

Plain static files, no build step. Serve this folder as the site root at `https://vyra.vyrechain.com/`.

After the token launches, edit `token.json` only (set `launched` to `true` and fill in `address`), then run `node --test test/site.test.mjs` and publish.

Headers are in `_headers` (Netlify/Cloudflare style). For nginx, the same policy:

```nginx
add_header Content-Security-Policy "default-src 'none'; img-src 'self'; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
error_page 404 /404.html;
location /img/   { expires 1y; add_header Cache-Control "public, immutable"; }
location /fonts/ { expires 1y; add_header Cache-Control "public, immutable"; }
location = /token.json { add_header Cache-Control "no-cache"; }
```

The font files are SIL Open Font License 1.1 (`fonts/OFL-Archivo.txt`).
