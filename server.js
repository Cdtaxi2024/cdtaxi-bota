const http = require('http');
const fs = require('fs');
const path = require('path');

const bookingsFile = path.join(__dirname, 'data', 'bookings.json');
let bookings = [];
try {
  bookings = JSON.parse(fs.readFileSync(bookingsFile));
} catch (e) {
  bookings = [];
}

const prices = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'prices.json')));

function calculatePrice(pickup, destination) {
  const key = `${pickup}-${destination}`;
  return prices[key] || 50;
}

function sendResponse(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': map[ext] || 'text/plain' });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/api/bookings') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const booking = JSON.parse(body || '{}');
      booking.price = calculatePrice(booking.pickup, booking.destination);
      bookings.push(booking);
      fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
      sendResponse(res, 200, booking);
    });
  } else if (req.method === 'GET' && url.pathname === '/api/bookings') {
    sendResponse(res, 200, bookings);
  } else {
    const filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    serveStatic(res, filePath);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
