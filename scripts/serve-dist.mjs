import { createServer, request as httpRequest } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const [rootArg, portArg = '5180', apiTargetArg = 'http://127.0.0.1:3010'] = process.argv.slice(2);

if (!rootArg) {
  console.error('Uso: node scripts/serve-dist.mjs <dist> <puerto>');
  process.exit(1);
}

const root = resolve(rootArg);
const port = Number(portArg);
const apiTarget = new URL(apiTargetArg);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendFile(res, file) {
  res.writeHead(200, {
    'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);

  if (url.pathname.startsWith('/api/')) {
    const proxyReq = httpRequest({
      hostname: apiTarget.hostname,
      port: apiTarget.port,
      path: `${url.pathname}${url.search}`,
      method: req.method,
      headers: req.headers,
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: 'Backend no disponible. Inicia start-backend.bat.' }));
    });

    req.pipe(proxyReq);
    return;
  }

  const requested = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  const file = requested.startsWith(root) && existsSync(requested) && statSync(requested).isFile()
    ? requested
    : join(root, 'index.html');

  sendFile(res, file);
}).listen(port, '0.0.0.0', () => {
  console.log(`Sirviendo ${root} en http://localhost:${port}`);
  console.log(`Proxy API /api -> ${apiTarget.href}`);
});
