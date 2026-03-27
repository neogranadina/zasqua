export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    // Serve PMTiles from /tiles/ path — same-origin, no CORS needed
    if (url.pathname.startsWith('/tiles/')) {
      return handleTiles(request, env, url);
    }

    let path = url.pathname;

    // Resolve directory paths to index.html
    if (path.endsWith('/')) {
      path += 'index.html';
    } else if (!path.includes('.', path.lastIndexOf('/'))) {
      // No file extension — try as directory
      path += '/index.html';
    }

    // Strip leading slash for R2 key
    const key = path.slice(1);

    // Check edge cache first
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);
    if (response) return response;

    // Fetch from R2
    const object = await env.SITE.get(key);

    if (!object) {
      // Try 404 page
      const notFound = await env.SITE.get('404.html');
      if (notFound) {
        response = new Response(notFound.body, {
          status: 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
        return response;
      }
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('content-type', contentType(key));
    headers.set('cache-control', cacheControl(key));
    headers.set('etag', object.httpEtag);

    response = new Response(object.body, { headers });

    // Store in edge cache (non-blocking)
    request.method === 'GET' && cache.put(cacheKey, response.clone());

    return response;
  },
};

function contentType(key) {
  const ext = key.split('.').pop().toLowerCase();
  const types = {
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    txt: 'text/plain; charset=utf-8',
    webmanifest: 'application/manifest+json',
  };
  return types[ext] || 'application/octet-stream';
}

function cacheControl(key) {
  const ext = key.split('.').pop().toLowerCase();
  if (['html', 'xml'].includes(ext)) return 'public, max-age=3600';
  if (['css', 'js'].includes(ext)) return 'public, max-age=604800';
  if (['json'].includes(ext)) return 'public, max-age=86400';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg', 'woff', 'woff2', 'ttf'].includes(ext)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

async function handleTiles(request, env, url) {
  const name = url.pathname.slice('/tiles/'.length);
  if (!name) return new Response('Not Found', { status: 404 });

  // PMTiles library requests /tiles/zasqua-places — append .pmtiles extension
  const key = name.endsWith('.pmtiles') ? name : name + '.pmtiles';

  const rangeHeader = request.headers.get('Range');
  const opts = {};

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const offset = parseInt(match[1]);
      const end = match[2] ? parseInt(match[2]) : undefined;
      opts.range = end !== undefined
        ? { offset, length: end - offset + 1 }
        : { offset };
    }
  }

  const object = await env.TILES.get(key, opts);
  if (!object) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  headers.set('content-type', 'application/octet-stream');
  headers.set('cache-control', 'public, max-age=86400');
  headers.set('accept-ranges', 'bytes');
  headers.set('etag', object.httpEtag);

  if (rangeHeader && object.range) {
    const { offset, length } = object.range;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', length);
    return new Response(object.body, { status: 206, headers });
  }

  headers.set('content-length', object.size);
  return new Response(object.body, { status: 200, headers });
}
