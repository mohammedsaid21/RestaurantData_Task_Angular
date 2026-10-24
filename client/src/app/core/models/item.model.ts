export interface Item {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  branchId: string;
  branchName: string;
  category: string;
  price: number;
  available: boolean;
  lastUpdated: string;
}

export interface ItemsQuery {
  search?: string;
  restaurantId?: string;
  branchId?: string;
  category?: string;
  available?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'price' | 'name' | 'lastUpdated';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface Stats {
  total: number;
  available: number;
  unavailable: number;
  avgPrice: number;
  byCategory: CategoryCount[];
}

export interface BranchOption {
  id: string;
  name: string;
}

export interface RestaurantOption {
  id: string;
  name: string;
  branches: BranchOption[];
}

export interface Meta {
  restaurants: RestaurantOption[];
  categories: string[];
}

export interface ItemPatch {
  price?: number;
  available?: boolean;
}
