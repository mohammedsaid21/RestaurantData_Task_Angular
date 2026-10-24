# Sharkhood Dashboard

Angular dashboard for browsing and editing a generated restaurant menu of 50,000 items. Filtering, sorting, and pagination run on the server. The browser keeps one page of rows.

## Installation and run commands

From the repository root:

```bash
npm install
npm install --prefix server
npm install --prefix client
npm start
```

- API: http://localhost:3000
- Angular app: http://localhost:4200
- `client/proxy.conf.json` sends `/api` to `http://localhost:3000`. `ng serve` already loads that file, and `npm start` runs the API and the client together.

`npm start` creates `server/data/items.json` when that file is missing. The file is gitignored.

Regenerate the same dataset at any time:

```bash
npm run seed
```

`faker.seed(42)` makes a new seed match the previous ids.

Run the tests once, with no watch mode:

```bash
npm test
```

## Technology choices

- **Angular 21 standalone components, routing, and SCSS.** The assessment requires Angular. Standalone components keep the feature folders free of NgModules. The dashboard and explorer routes are lazy-loaded.
- **Angular Material.** The table, paginator, sort headers, form fields, dialog, and toolbar come from Material instead of custom widgets.
- **Signals + RxJS.** Signals hold UI state and server state. RxJS handles HTTP, including `debounceTime`, `distinctUntilChanged`, `switchMap`, and `catchError`. That is enough for this app and is simpler to explain than NgRx.
- **Express.** A small API loads the menu into memory and writes `items.json` after a successful edit. NestJS, MongoDB, and Swagger are out of scope.
- **JSON file.** The seed writes one file. The API updates that file so an edit survives a browser refresh and an API restart.
- **ng2-charts (Chart.js).** One bar chart shows the item count per category.

## State management approach

| UI state | Server state |
| --- | --- |
| Search, restaurant, branch, category, availability, min price, max price | `items` for the current page |
| `sortBy`, `sortOrder` | `total` after filtering, before paging |
| `page`, `pageSize` | `status`: `idle`, `loading`, `success`, or `error` |
| | `error` message |

`ExplorerStore.query` is a computed `ItemsQuery`. `toObservable(query)` is piped through `switchMap` to `GET /api/items`. `switchMap` unsubscribes from the previous request, so a slow older response cannot replace a newer one. `mergeMap` would let that stale response win. `exhaustMap` would ignore the newer query until the old one finished.

The name field uses a `FormControl` with `debounceTime(300)` and `distinctUntilChanged`, then writes the `search` signal. Other filters write their signals immediately. A filter or sort change sets `page` back to 1. Changing only the page does not clear the filters.

Edit path: dialog form, then `ExplorerStore.updateItem`, then `ItemsApiService.updateItem`. The component does not call `HttpClient`. On success the store replaces the row, or reloads the page if the row no longer matches the filters, and `StatsStore.load()` requests `GET /api/stats` again. `StatsStore` is `providedIn: 'root'`, so the dashboard sees that refresh even when it is not on screen. Table filters do not request `/api/stats`.

## Large-data strategy

`query.js` filters, sorts, and pages the in-memory array. `GET /api/items` returns at most one page (`pageSize` defaults to 25). The browser does not download the 50,000 rows. `total` is the filtered count before the page is sliced, and the paginator uses that number.

`GET /api/stats` aggregates the full server dataset. Dashboard KPIs and the category chart use that response, not the current table page.

## Performance optimizations

- `ChangeDetectionStrategy.OnPush` on the shell and feature components.
- Table rows are tracked by `item.id`.
- Search is debounced by 300ms.
- Dashboard and explorer are lazy-loaded.
- `switchMap` cancels the previous list request when the query changes.

## Testing instructions

`npm test` runs both suites once.

Server (`node --test query.test.js`):

- Combined filters, with `total` counted before the page is sliced.
- Price sort with an id tie-break.
- Empty search is ignored, and a later page is sliced after sorting.
- An unknown sort field is rejected.

Client (Angular TestBed, Vitest, `--watch=false`):

- Combined filters and pagination. A later filter change sends `page` 1.
- A successful update replaces the matching row and calls `StatsStore.load()`. A failed update leaves the previous rows in place. An update that falls outside the active filters reloads the page.
- An older list response cannot overwrite a newer one.
- A failed `GET /api/items` sets `status` to `error`, and `retry()` can return to `success`.
- `ItemsApiService` sends only defined query params, including `available=false`, and patches `/api/items/:id`.

## Known limitations

- There is no database. The menu lives in memory and in `server/data/items.json`.
- There is no authentication.
- The table is paged. It does not virtual-scroll the full result set.
- File writes are queued on one promise chain. Overlapping edits from several processes can still lose an update.
- The branch list is filtered by the selected restaurant in the UI. The API still accepts `restaurantId` and `branchId` together.
- The first API boot generates the file when it is missing. `npm run seed` is the way to force a fresh copy.

## Decision log

If a successful edit no longer matches the active filters, the store reloads the current page instead of only replacing the row. A local replace would leave a visible row outside the filter and would leave `total` wrong. If the edited item still matches, the store replaces that row by id and still refreshes `/api/stats`.

## Time spent

About two hours on 24 October 2026. The scaffold and API were committed around 16:47, and the client features and tests around 17:18–17:24 (UTC+2). The README and automatic seed followed in the same sitting. AI assistance was used. There is no separate hand-written timesheet.

## What I would improve

- Virtual scrolling for the rows already on the current page if the page size grows.
- NgRx only if more features start sharing the same server cache.
- End-to-end tests for the dialog and the Network page size.
- Optimistic update of the edited row, with a rollback if `PATCH` fails.
- An index for name search instead of scanning the full array on every request.
- OpenAPI for the query parameters.

## Architecture

```
Filters → ExplorerStore → ItemsApiService → Express / query.js → items.json
                                              ↑
StatsStore  →  GET /api/stats  ──────────────┘
     ↑
ExplorerStore.updateItem
```
