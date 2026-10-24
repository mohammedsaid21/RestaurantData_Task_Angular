const fs = require('node:fs');
const path = require('node:path');
const { faker } = require('@faker-js/faker');

const ITEM_COUNT = 50_000;
const DATA_FILE = path.join(__dirname, 'data', 'items.json');

const RESTAURANTS = [
  'Sharkhood Grill',
  'Coral Bites',
  'Harbor House',
  'Palm Oven',
  'Tide Kitchen',
  'Marina Table',
  'Reef Burger',
  'Bluefin Diner',
];

const CATEGORIES = [
  'Burgers',
  'Pizza',
  'Salads',
  'Desserts',
  'Drinks',
  'Seafood',
  'Grill',
  'Sandwiches',
  'Breakfast',
  'Sides',
];

function buildCatalog() {
  faker.seed(42);

  const categoryCount = faker.number.int({ min: 8, max: 10 });
  const categories = faker.helpers.arrayElements(CATEGORIES, categoryCount);

  const restaurants = RESTAURANTS.map((name, index) => {
    const branchCount = faker.number.int({ min: 3, max: 5 });
    const branches = Array.from({ length: branchCount }, (_, branchIndex) => ({
      id: `branch-${index + 1}-${branchIndex + 1}`,
      name: `${faker.location.city()} Branch`,
    }));
    return {
      id: `restaurant-${index + 1}`,
      name,
      branches,
    };
  });

  return { categories, restaurants };
}

function buildItems(catalog) {
  const { categories, restaurants } = catalog;
  const items = new Array(ITEM_COUNT);

  for (let index = 0; index < ITEM_COUNT; index += 1) {
    const restaurant = restaurants[faker.number.int({ min: 0, max: restaurants.length - 1 })];
    const branch = restaurant.branches[faker.number.int({ min: 0, max: restaurant.branches.length - 1 })];
    const category = categories[faker.number.int({ min: 0, max: categories.length - 1 })];

    items[index] = {
      id: `item-${String(index + 1).padStart(6, '0')}`,
      name: faker.food.dish(),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      branchId: branch.id,
      branchName: branch.name,
      category,
      price: faker.number.float({ min: 1, max: 250, fractionDigits: 2 }),
      available: faker.datatype.boolean(),
      lastUpdated: faker.date.recent({ days: 120 }).toISOString(),
    };
  }

  return items;
}

function seed() {
  const catalog = buildCatalog();
  const items = buildItems(catalog);
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(items));

  const branchCount = catalog.restaurants.reduce((sum, restaurant) => sum + restaurant.branches.length, 0);
  console.log(
    `Seeded ${items.length} items, ${catalog.restaurants.length} restaurants, ${branchCount} branches, ${catalog.categories.length} categories`,
  );
  console.log(`Wrote ${DATA_FILE}`);
}

module.exports = { seed };

if (require.main === module) {
  seed();
}
