const http = require('http');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const bookingsFile = path.join(dataDir, 'bookings.json');
const vehiclesFile = path.join(__dirname, 'config', 'vehicles.json');

function ensureDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, '[]');
  }
}

function loadBookings() {
  try {
    const file = fs.readFileSync(bookingsFile, 'utf-8');
    return JSON.parse(file || '[]');
  } catch (error) {
    return [];
  }
}

function loadVehicles() {
  try {
    const file = fs.readFileSync(vehiclesFile, 'utf-8');
    return JSON.parse(file || '[]');
  } catch (error) {
    return [];
  }
}

function saveBookings(bookings) {
  fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
}

function saveVehicles(vehicles) {
  fs.writeFileSync(vehiclesFile, JSON.stringify(vehicles, null, 2));
}

function roundCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

function calculatePrice(booking, vehicles) {
  const vehicle = vehicles.find((v) => v.id === booking.vehicleId);
  if (!vehicle) {
    return 0;
  }

  const distanceKm = (booking.distanceMeters || 0) / 1000;
  const durationMin = (booking.durationSeconds || 0) / 60;
  let price = vehicle.baseFare + vehicle.perKm * distanceKm + vehicle.perMin * durationMin;

  const extraStops = Math.max(0, (booking.extraStops || 0));
  if (extraStops > 0) {
    price += extraStops * (vehicle.extraStopFee || 0);
  }

  const baggageCounts = booking.baggage || {};
  const included = vehicle.luggageIncluded || {};
  const extras = vehicle.extraPerBag || {};
  ['large', 'small', 'hand'].forEach((type) => {
    const requested = Number(baggageCounts[type] || 0);
    const allowance = Number(included[type] || 0);
    const extraBags = Math.max(0, requested - allowance);
    if (extraBags > 0) {
      price += extraBags * (extras[type] || 0);
    }
  });

  if (booking.returnTrip) {
    const multiplier = vehicle.returnMultiplier || 2;
    price *= multiplier;
  }

  if (booking.paymentMethod) {
    const surcharges = vehicle.paymentSurcharges || {};
    price += surcharges[booking.paymentMethod] || 0;
  }

  if (booking.immediatePickup) {
    price += vehicle.immediatePickupFee || 0;
  }

  return roundCurrency(price);
}

function sendResponse(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': map[ext] || 'text/plain' });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('Not found');
  }
}

ensureDataDirectory();
let bookings = loadBookings();
let vehicles = loadVehicles();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/bookings') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const booking = JSON.parse(body || '{}');
        const vehicle = vehicles.find((v) => v.id === booking.vehicleId) || null;
        booking.vehicleName = vehicle ? vehicle.name : booking.vehicleId;
        booking.price = calculatePrice(booking, vehicles);
        booking.createdAt = new Date().toISOString();
        bookings.push(booking);
        saveBookings(bookings);
        sendResponse(res, 201, booking);
      } catch (error) {
        sendResponse(res, 400, { message: 'Invalid booking payload' });
      }
    });
  } else if (req.method === 'GET' && url.pathname === '/api/bookings') {
    sendResponse(res, 200, bookings);
  } else if (req.method === 'GET' && url.pathname === '/api/vehicles') {
    sendResponse(res, 200, vehicles);
  } else if (req.method === 'PUT' && url.pathname.startsWith('/api/vehicles/')) {
    const vehicleId = url.pathname.split('/').pop();
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const updates = JSON.parse(body || '{}');
        let updatedVehicle = null;
        vehicles = vehicles.map((vehicle) => {
          if (vehicle.id === vehicleId) {
            updatedVehicle = { ...vehicle, ...updates };
            return updatedVehicle;
          }
          return vehicle;
        });
        if (!updatedVehicle) {
          sendResponse(res, 404, { message: 'Vehicle not found' });
          return;
        }
        saveVehicles(vehicles);
        sendResponse(res, 200, updatedVehicle);
      } catch (error) {
        sendResponse(res, 400, { message: 'Invalid payload' });
      }
    });
  } else {
    const relativePath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
    const filePath = path.join(__dirname, 'public', relativePath);
    serveStatic(res, filePath);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
