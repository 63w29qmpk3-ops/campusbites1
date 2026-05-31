// server.js
// CampusBites - Local Static Server (Runs on pure Node.js, no external dependencies required)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Normalize URL path to resolve file routes
  let urlPath = req.url.split('?')[0]; // strip query strings
  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  
  // Security check: restrict navigation outside the project directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 File Not Found</h1><p>Make sure the file path is correct.</p>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}\n`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log(`🚀 CampusBites local server running!`);
  console.log(`👉 Access URL: http://localhost:${PORT}/index.html`);
  console.log(`==================================================`);
  console.log('Press Ctrl+C to close the server.');
});
