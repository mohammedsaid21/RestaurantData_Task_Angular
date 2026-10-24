const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { QueryError, queryItems } = require('./query');

const items = [
  {
    id: 'item-000001',
    name: 'Burger Deluxe',
    restaurantId: 'restaurant-1',
    restaurantName: 'Sharkhood Grill',
    branchId: 'branch-1-1',
    branchName: 'Harbor',
    category: 'Burgers',
    price: 12.5,
    available: true,
    lastUpdated: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'item-000002',
    name: 'Cheese Burger',
    restaurantId: 'restaurant-1',
    restaurantName: 'Sharkhood Grill',
    branchId: 'branch-1-2',
    branchName: 'Marina',
    category: 'Burgers',
    price: 9,
    available: false,
    lastUpdated: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'item-000003',
    name: 'Garden Salad',
    restaurantId: 'restaurant-2',
    restaurantName: 'Coral Bites',
    branchId: 'branch-2-1',
    branchName: 'Palm',
    category: 'Salads',
    price: 7.25,
    available: true,
    lastUpdated: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'item-000004',
    name: 'Burger Bites',
    restaurantId: 'restaurant-2',
    restaurantName: 'Coral Bites',
    branchId: 'branch-2-1',
    branchName: 'Palm',
    category: 'Burgers',
    price: 15,
    available: true,
    lastUpdated: '2026-04-01T00:00:00.000Z',
  },
];

describe('queryItems', () => {
  it('applies combined filters and returns the total before pagination', () => {
    const result = queryItems(items, {
      search: 'burger',
      restaurantId: 'restaurant-1',
      category: 'Burgers',
      available: 'true',
      minPrice: '10',
      maxPrice: '20',
      page: '1',
      pageSize: '1',
    });

    assert.equal(result.total, 1);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].id, 'item-000001');
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 1);
  });

  it('sorts by price descending and keeps a stable id tie-break', () => {
    const result = queryItems(items, {
      category: 'Burgers',
      sortBy: 'price',
      sortOrder: 'desc',
    });

    assert.deepEqual(
      result.data.map((item) => item.id),
      ['item-000004', 'item-000001', 'item-000002'],
    );
    assert.equal(result.total, 3);
  });

  it('ignores an empty search and paginates after sorting', () => {
    const result = queryItems(items, {
      search: '   ',
      sortBy: 'name',
      page: 2,
      pageSize: 2,
    });

    assert.equal(result.total, 4);
    assert.deepEqual(
      result.data.map((item) => item.name),
      ['Cheese Burger', 'Garden Salad'],
    );
  });

  it('rejects an unknown sort field', () => {
    assert.throws(() => queryItems(items, { sortBy: 'id' }), QueryError);
  });
});
