const fs = require('node:fs');
const path = require('node:path');
const cors = require('cors');
const express = require('express');
const { QueryError, queryItems } = require('./query');

const DATA_FILE = path.join(__dirname, 'data', 'items.json');
const PORT = Number(process.env.PORT) || 3000;
const MAX_PRICE = 10_000;
const MAX_DELAY_MS = 5_000;

const app = express();
app.use(cors());
app.use(express.json());

let items = [];
let saveChain = Promise.resolve();

function loadItems() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log(`Missing ${DATA_FILE}. Generating data...`);
    require('./seed').seed();
  }
  items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(items)) {
    console.error(`${DATA_FILE} must contain an array.`);
    process.exit(1);
  }
}

function persist() {
  const snapshot = JSON.stringify(items);
  saveChain = saveChain
    .catch(() => undefined)
    .then(() => fs.promises.writeFile(DATA_FILE, snapshot));
  return saveChain;
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function readDelay(req) {
  if (req.query.delay === undefined) {
    return 0;
  }
  const delay = Number(req.query.delay);
  if (!Number.isInteger(delay) || delay < 0 || delay > MAX_DELAY_MS) {
    const error = new QueryError(`delay must be an integer from 0 to ${MAX_DELAY_MS}`);
    throw error;
  }
  return delay;
}

async function applyDelay(req) {
  const delay = readDelay(req);
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

function validatePrice(price) {
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    return 'price must be a number';
  }
  if (price <= 0 || price > MAX_PRICE) {
    return `price must be greater than 0 and at most ${MAX_PRICE}`;
  }
  if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-8) {
    return 'price must have at most 2 decimal places';
  }
  return null;
}

function buildMeta() {
  const restaurants = new Map();
  const categories = new Set();

  for (const item of items) {
    let restaurant = restaurants.get(item.restaurantId);
    if (!restaurant) {
      restaurant = {
        id: item.restaurantId,
        name: item.restaurantName,
        branches: new Map(),
      };
      restaurants.set(item.restaurantId, restaurant);
    }
    if (!restaurant.branches.has(item.branchId)) {
      restaurant.branches.set(item.branchId, {
        id: item.branchId,
        name: item.branchName,
      });
    }
    categories.add(item.category);
  }

  return {
    restaurants: [...restaurants.values()]
      .map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        branches: [...restaurant.branches.values()].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
  };
}

function buildStats() {
  const counts = new Map();
  let available = 0;
  let priceSum = 0;

  for (const item of items) {
    if (item.available) {
      available += 1;
    }
    priceSum += item.price;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  const total = items.length;
  return {
    total,
    available,
    unavailable: total - available,
    avgPrice: total === 0 ? 0 : Math.round((priceSum / total) * 100) / 100,
    byCategory: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category)),
  };
}

app.get('/api/items', asyncHandler(async (req, res) => {
  await applyDelay(req);
  res.json(queryItems(items, req.query));
}));

app.get('/api/items/:id', asyncHandler(async (req, res) => {
  await applyDelay(req);
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }
  res.json(item);
}));

app.patch('/api/items/:id', asyncHandler(async (req, res) => {
  await applyDelay(req);
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ message: 'Body must be an object' });
    return;
  }

  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => key !== 'price' && key !== 'available')) {
    res.status(400).json({ message: 'Body must contain only price and/or available' });
    return;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'price')) {
    const priceError = validatePrice(body.price);
    if (priceError) {
      res.status(400).json({ message: priceError });
      return;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'available') && typeof body.available !== 'boolean') {
    res.status(400).json({ message: 'available must be a boolean' });
    return;
  }

  const previous = { price: item.price, available: item.available, lastUpdated: item.lastUpdated };
  if (Object.prototype.hasOwnProperty.call(body, 'price')) {
    item.price = body.price;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'available')) {
    item.available = body.available;
  }
  item.lastUpdated = new Date().toISOString();

  try {
    await persist();
  } catch (error) {
    item.price = previous.price;
    item.available = previous.available;
    item.lastUpdated = previous.lastUpdated;
    throw error;
  }

  res.json(item);
}));

app.get('/api/stats', asyncHandler(async (req, res) => {
  await applyDelay(req);
  res.json(buildStats());
}));

app.get('/api/meta', asyncHandler(async (req, res) => {
  await applyDelay(req);
  res.json(buildMeta());
}));

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const status = error.status || 500;
  res.status(status).json({ message: error.message || 'Internal Server Error' });
});

loadItems();
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} with ${items.length} items`);
});
