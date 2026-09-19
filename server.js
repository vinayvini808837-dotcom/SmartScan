const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const BACKEND_PORT = 5000;
const PUBLIC_DIR = path.join(__dirname, 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

function createServer() {
  return http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      let pathname = decodeURIComponent(parsedUrl.pathname);

      // PROXY ALL /api/* REQUESTS TO EXPRESS BACKEND ON PORT 5000
      if (pathname.startsWith('/api')) {
        const proxyReq = http.request({
          hostname: '127.0.0.1',
          port: BACKEND_PORT,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: `127.0.0.1:${BACKEND_PORT}`
          }
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          console.warn(`[Proxy Warning] Could not reach backend on port ${BACKEND_PORT}: ${err.message}`);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: `Backend proxy error: Ensure backend is running on port ${BACKEND_PORT}.`
          }));
        });

        req.pipe(proxyReq);
        return;
      }

      if (pathname === '/') {
        pathname = '/index.html';
      }

      let filePath = path.join(PUBLIC_DIR, pathname);

      // Support clean URLs without .html
      if (!path.extname(filePath) && !fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      }

      // Security: ensure request stays inside PUBLIC_DIR
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }

      fs.stat(resolvedPath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html>
<html>
<head><title>404 - Page Not Found</title><meta charset="utf-8"></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
  <h2>404 - Resource Not Found</h2>
  <p>The requested file <code>${pathname}</code> does not exist.</p>
  <p><a href="/" style="color:#004F9F;">Return to ComplyScan Home</a></p>
</body>
</html>`);
          return;
        }

        const ext = path.extname(resolvedPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        });

        const stream = fs.createReadStream(resolvedPath);
        stream.pipe(res);
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Server Error: ${e.message}`);
    }
  });
}

function startServer(port) {
  const server = createServer();

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 ComplyScan Full-Stack Dev Server`);
    console.log(`   Frontend:   http://localhost:${port}`);
    console.log(`   API Proxy:  http://localhost:${port}/api -> :${BACKEND_PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer(PORT);
