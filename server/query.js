const SORT_FIELDS = new Set(['price', 'name', 'lastUpdated']);
const MAX_PAGE_SIZE = 100;

class QueryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueryError';
    this.status = 400;
  }
}

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function optionalString(value, name) {
  if (isEmpty(value)) {
    return undefined;
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new QueryError(`${name} must be a string`);
  }
  const text = String(value).trim();
  return text === '' ? undefined : text;
}

function optionalNumber(value, name) {
  if (isEmpty(value)) {
    return undefined;
  }
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new QueryError(`${name} must be a number`);
  }
  return number;
}

function optionalBoolean(value, name) {
  if (isEmpty(value)) {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  throw new QueryError(`${name} must be true or false`);
}

function requiredPositiveInt(value, name, fallback) {
  if (isEmpty(value)) {
    return fallback;
  }
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new QueryError(`${name} must be a positive integer`);
  }
  return number;
}

function normalizeQuery(params = {}) {
  const sortBy = optionalString(params.sortBy, 'sortBy') ?? 'name';
  if (!SORT_FIELDS.has(sortBy)) {
    throw new QueryError('sortBy must be price, name, or lastUpdated');
  }

  const sortOrder = optionalString(params.sortOrder, 'sortOrder') ?? 'asc';
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    throw new QueryError('sortOrder must be asc or desc');
  }

  const pageSize = requiredPositiveInt(params.pageSize, 'pageSize', 25);
  if (pageSize > MAX_PAGE_SIZE) {
    throw new QueryError(`pageSize must be ${MAX_PAGE_SIZE} or less`);
  }

  return {
    search: optionalString(params.search, 'search'),
    restaurantId: optionalString(params.restaurantId, 'restaurantId'),
    branchId: optionalString(params.branchId, 'branchId'),
    category: optionalString(params.category, 'category'),
    available: optionalBoolean(params.available, 'available'),
    minPrice: optionalNumber(params.minPrice, 'minPrice'),
    maxPrice: optionalNumber(params.maxPrice, 'maxPrice'),
    sortBy,
    sortOrder,
    page: requiredPositiveInt(params.page, 'page', 1),
    pageSize,
  };
}

function compareItems(a, b, sortBy) {
  let result = 0;
  if (sortBy === 'price') {
    result = a.price - b.price;
  } else if (sortBy === 'lastUpdated') {
    result = a.lastUpdated < b.lastUpdated ? -1 : a.lastUpdated > b.lastUpdated ? 1 : 0;
  } else {
    result = a.name.localeCompare(b.name);
  }
  if (result === 0) {
    result = a.id.localeCompare(b.id);
  }
  return result;
}

function queryItems(items, params = {}) {
  const query = normalizeQuery(params);
  const filtered = items.filter((item) => {
    if (query.search && !item.name.toLowerCase().includes(query.search.toLowerCase())) {
      return false;
    }
    if (query.restaurantId && item.restaurantId !== query.restaurantId) {
      return false;
    }
    if (query.branchId && item.branchId !== query.branchId) {
      return false;
    }
    if (query.category && item.category !== query.category) {
      return false;
    }
    if (query.available !== undefined && item.available !== query.available) {
      return false;
    }
    if (query.minPrice !== undefined && item.price < query.minPrice) {
      return false;
    }
    if (query.maxPrice !== undefined && item.price > query.maxPrice) {
      return false;
    }
    return true;
  });

  const direction = query.sortOrder === 'desc' ? -1 : 1;
  const sorted = filtered.slice().sort((a, b) => direction * compareItems(a, b, query.sortBy));
  const start = (query.page - 1) * query.pageSize;

  return {
    data: sorted.slice(start, start + query.pageSize),
    total: sorted.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

module.exports = {
  MAX_PAGE_SIZE,
  QueryError,
  normalizeQuery,
  queryItems,
};
