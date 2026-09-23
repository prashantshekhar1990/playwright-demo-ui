# Playwright Demo UI

A small practice web application for learning and demonstrating UI test automation with [Playwright](https://playwright.dev). It contains 17 scenario pages (forms, frames, popups, tables, file upload, authentication, network mocking, a mini e-commerce flow, and more), all behind a login gate, and a matching Playwright test suite written in TypeScript that exercises most of the Playwright Test API — not just the scenario pages. See [Playwright concepts covered](#playwright-concepts-covered) below for the full map.

- **App:** an Express server (`server.js`) that serves static HTML pages from `public/` plus a set of small JSON APIs (session login, a shop cart/checkout, the users table, file upload/download, HTTP Basic Auth, slow and flaky endpoints).
- **Tests:** Playwright specs in `tests/`. `01-basic.spec.ts` … `15-complex.spec.ts` are one file per scenario page; `16-runner-and-fixtures.spec.ts`, `17-context-config.spec.ts` and `18-data-driven-api.spec.ts` are cross-cutting — runner/fixture features, browser/context configuration, and API/data-driven testing, each against whichever page or endpoint fits best rather than one dedicated page each.

## Prerequisites

- **Node.js 18 or newer.** npm is bundled with Node.js, so installing Node.js installs npm.

### Installing Node.js and npm

1. Download the LTS installer from <https://nodejs.org> and run it (accept the defaults).
2. Open a new terminal and check both are available:

   ```bash
   node --version
   npm --version
   ```

   `node --version` should print `v18.x` or higher.

## Setup

From the project folder:

```bash
# 1. Install project dependencies (Express, multer, Playwright, TypeScript)
npm install

# 2. Download the browser Playwright drives (one-time)
npx playwright install chromium
```

## Starting the server

```bash
npm start
```

The app is now running at <http://localhost:3000>. Open it in a browser to see the home page with a tile for each scenario. Stop the server with `Ctrl+C`.

To use a different port, set `PORT` before starting (for example `$env:PORT=4000; npm start` in PowerShell, or `PORT=4000 npm start` in bash). If you do, also update `baseURL` and the `webServer` URL in [playwright.config.ts](playwright.config.ts), which are set to port 3000.

> You do not need to start the server yourself to run the tests. See below.

## Available pages

The home page (`/`) links to all of these. Test-ids such as `data-testid="tile-basic"` are used throughout so locators stay stable.

| # | Page | URL | What it covers |
|---|------|-----|----------------|
| 1 | Basic elements | `/pages/basic.html` | Input, button, checkbox, radio, dropdown |
| 2 | Links | `/pages/links.html` | Same tab, new tab, new window, broken link |
| 3 | Multiple tabs | `/pages/tabs.html` | Parent → child → grandchild tabs |
| 4 | Frames | `/pages/frames.html` | Single, nested and multiple iframes |
| 5 | Windows / popups | `/pages/popups.html` | Popup window, alert, confirm, prompt, in-page modal |
| 6 | Dynamic elements | `/pages/dynamic.html` | Elements that appear, disappear, are added or removed |
| 7 | Waits | `/pages/waits.html` | Auto-wait, explicit conditions, network waits |
| 8 | Tables | `/pages/tables.html` | Static and dynamic tables, pagination, sorting, search |
| 9 | Dropdowns | `/pages/dropdowns.html` | Native, custom and searchable dropdowns |
| 10 | Mouse | `/pages/mouse.html` | Hover, drag and drop, right click, double click |
| 11 | Keyboard | `/pages/keyboard.html` | Enter, Tab, Escape, shortcuts |
| 12 | Upload / download | `/pages/files.html` | Single and multiple upload, file downloads |
| 13 | Authentication | `/pages/auth.html` | Login, session, storage state |
| 14 | Network | `/pages/network.html` | Mocking, interception, request validation, flaky endpoint |
| 15 | Complex apps | `/pages/complex.html` | Shadow DOM, calendar, autocomplete, virtual list |
| 16 | Mini e-commerce | `/pages/shop-catalog.html` | Catalog search/filter, product detail, cart, dummy checkout |
| 17 | Environment info | `/pages/env-info.html` | Viewport, locale, timezone, color scheme, geolocation, HTTP Basic Auth |

**Every page requires login.** The server denies all pages by default and redirects to `/login.html`; only the login page itself, `/assets/*`, `/api/*` and `/download/*` are reachable while logged out. Tests run pre-authenticated (see [Playwright concepts covered](#playwright-concepts-covered) below) — this only matters if you're clicking around by hand.

Supporting pages (not on the home page): `/login.html`, `/pages/dashboard.html` (a login-protected page used by the auth tests), `/pages/tab-level.html`, `/pages/popup-child.html`, `/pages/frame-outer.html` and `/pages/frame-content.html` (targets opened or embedded by the pages above).

### Demo credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |
| `user` | `user123` | user |
| `locked` | *(anything)* | always returns 403 "Account locked" |
| `basicuser` | `basicpass123` | HTTP Basic Auth only (`GET /api/basic-auth/secret`) — separate from the cookie-session logins above |

## Running the tests

```bash
npm test
```

This runs the full suite (101 tests, 2 deliberately skipped as demos — see `test.skip`/`test.fixme` in [16-runner-and-fixtures.spec.ts](tests/16-runner-and-fixtures.spec.ts)) with Chromium. Playwright starts the app automatically before the tests (`npm start`), or reuses it if it is already running on port 3000.

Useful variations:

```bash
npm run test:ui                                # interactive Playwright UI mode
npm run test:ci                                # headless, retries: 2 (playwright.ci.config.ts)
npm run test:cross-browser                     # Chromium + Firefox + WebKit (playwright.cross-browser.config.ts)
npm run test:smoke                             # only tests tagged @smoke
npm run test:codegen                           # opens Playwright's codegen recorder against the running app
npx playwright test tests/08-tables.spec.ts    # a single spec file
npx playwright test -g "drag and drop"         # tests whose title matches
```

Notes on how the suite is configured (see [playwright.config.ts](playwright.config.ts)):

- Tests run **headed** (a visible browser window) with a single worker, because sessions, the shop cart and the flaky-endpoint counter all live in server memory. To run headless, use `npm run test:ci` or change `headless: false` to `true` in the config.
- To use an already-installed Chromium instead of the Playwright download, set the `CHROMIUM_PATH` environment variable to its executable path.
- `npm run test:cross-browser` needs Firefox and WebKit installed too: `npx playwright install firefox webkit` (one-time, in addition to the Chromium install in Setup above).

### Test results and reports

Each run writes to its own timestamped folder, `output/<YYYY-MM-DD_HH-mm-ss>/`, containing:

- `html-report/`: the HTML report
- `results.json` and `results.xml`: JSON and JUnit results
- `artifacts/`: traces and other files for failed tests

Open the most recent HTML report with:

```bash
npm run report
```

Set the `RUN_ID` environment variable to choose the folder name yourself.

## Project layout

```
public/                          Static pages (index.html, pages/*.html) and shared assets
server.js                        Express server and JSON APIs
tests/                           Playwright specs, one per scenario
tests/support/                   Shared test data and auth-file paths
tests/pages/                     Page objects / component abstractions (LoginPage, CatalogPage, CartPage)
tests/fixtures.ts                Custom fixtures (test.extend), used by 16-runner-and-fixtures.spec.ts
tests/global-setup.ts            Runs once before the whole run
tests/global-teardown.ts         Runs once after the whole run
scripts/                         Helper scripts (show-latest-report.js)
playwright.config.ts             Default config: headed, Chromium only, single worker
playwright.ci.config.ts          Headless + retries, same everything else
playwright.cross-browser.config.ts   Chromium + Firefox + WebKit (opt-in, not part of `npm test`)
```

## Playwright concepts covered

This project deliberately exercises most of the Playwright Test surface, not just the 17 scenario pages above. Each row says where to find a working example, and whether it was verified by actually running it.

**Playwright fundamentals**
| Topic | Where |
|---|---|
| Playwright architecture, Playwright vs Selenium | Conceptual — no code artifact; Playwright drives real browsers over CDP/WebSocket protocols instead of a WebDriver server per browser, which is the short version of "vs Selenium" |
| Browser / BrowserContext / Page | [tests/17-context-config.spec.ts](tests/17-context-config.spec.ts) makes all three explicit (`browser.newContext()`, `context.newPage()`, `browser.newPage()`) |
| Chromium, Firefox, WebKit | Default config is Chromium-only; [playwright.cross-browser.config.ts](playwright.cross-browser.config.ts) adds Firefox + WebKit, run via `npm run test:cross-browser` |

**Test runner**
| Topic | Where |
|---|---|
| `test()`, `expect()`, `test.describe()`, test titles/organization | Throughout every spec |
| `test.step()` | [tests/16-runner-and-fixtures.spec.ts](tests/16-runner-and-fixtures.spec.ts) |
| `test.skip()`, `test.fixme()`, `test.fail()`, `test.slow()` | Same file, `skip / fixme / fail / slow` describe block |
| `test.only()` | Deliberately **not** used anywhere — it would skip every other test in the project. Explained in a comment in the same file instead |
| Annotations and tags | Same file, `{ tag: '@smoke' }` / `{ tag: '@regression', annotation: {...} }`. Filter with `npm run test:smoke` or `npx playwright test --grep @regression` |

**Fixtures** — all in [tests/fixtures.ts](tests/fixtures.ts), used by [tests/16-runner-and-fixtures.spec.ts](tests/16-runner-and-fixtures.spec.ts)
| Topic | Where |
|---|---|
| Built-in fixtures: `page`, `browser`, `context`, `request` | Used throughout; `browser` also used directly in 17-context-config.spec.ts |
| `test.extend()`, custom fixtures | `fixtures.ts` exports its own `test`/`expect` |
| Fixture dependencies | `userPage` depends on the built-in `browser` + `baseURL`; `failOnConsoleError` depends on `page` |
| Fixture scopes: test-scoped, worker-scoped | `userPage`/`catalogPage` (test-scoped) vs `workerStartedAt` (worker-scoped) |
| Automatic fixtures | `failOnConsoleError` (`auto: true`) — fails a test if the page logged a console error |
| Fixture teardown | `userPage` closes its browser context after the test |
| Fixture composition | `catalogPage` is built on top of the custom `userPage` fixture, not a built-in one |

**Hooks**
| Topic | Where |
|---|---|
| `beforeAll` / `afterAll`, `beforeEach` / `afterEach` | [tests/16-runner-and-fixtures.spec.ts](tests/16-runner-and-fixtures.spec.ts) |
| `globalSetup` / `globalTeardown` | [tests/global-setup.ts](tests/global-setup.ts) / [tests/global-teardown.ts](tests/global-teardown.ts), wired in `playwright.config.ts`. Different from the `setup` **project** ([tests/auth.setup.ts](tests/auth.setup.ts)): global setup has no browser and can't depend on other projects — it's for run-wide bookkeeping, not app logins |

**Locators**
| Topic | Where |
|---|---|
| `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByTestId` | Throughout |
| `getByAltText`, `getByTitle` | [tests/17-context-config.spec.ts](tests/17-context-config.spec.ts), against `/pages/env-info.html` |

**Waiting**
| Topic | Where |
|---|---|
| `waitForLoadState`, `waitForResponse`, `waitForRequest`, `waitForEvent`, `locator.waitFor()` | 02-links, 07-waits, 14-network |
| `waitForURL` | [tests/17-context-config.spec.ts](tests/17-context-config.spec.ts), after a client-side login redirect |

**Assertions** — `toBeVisible/Hidden/Enabled/Disabled`, `toHaveText`, `toContainText`, `toHaveValue`, `toHaveAttribute`, `toHaveURL` are used throughout; `toHaveTitle` is in [tests/17-context-config.spec.ts](tests/17-context-config.spec.ts).

**Browser / context configuration** — all in [tests/17-context-config.spec.ts](tests/17-context-config.spec.ts) against the new `/pages/env-info.html` diagnostics page
| Topic | Where |
|---|---|
| `viewport`, `locale`, `timezoneId`, `colorScheme`, `userAgent` | `browser context configuration` describe block |
| `permissions`, `geolocation` | Same block, geolocation test |
| `httpCredentials` | Same block, against a new `GET /api/basic-auth/secret` endpoint (separate from the cookie-session login) |
| `storageState`, reusing authentication | The `setup` project + every spec (see [tests/auth.setup.ts](tests/auth.setup.ts)) |
| Context isolation | `context isolation and browser.newPage()` describe block (two contexts don't share `localStorage`) |
| Cookies | Same block — `context.cookies()` / `context.addCookies()` |
| Local storage, session storage | `authToken`/`rememberedUser` in localStorage, `loginTime` in sessionStorage (`public/login.html`); asserted in `13-auth.spec.ts` |
| Proxy | **Not implemented** — would need a separate proxy server process; out of scope here. `browser.newContext({ proxy: {...} })` is the API if you add one |

**Multiple tabs/windows, frames, dialogs, mouse, keyboard, forms, files, network interception** — the original 15 scenario pages/specs; unchanged.

**API testing** — [tests/18-data-driven-api.spec.ts](tests/18-data-driven-api.spec.ts)
| Topic | Where |
|---|---|
| `request.get/post/put/patch/delete` | All five verbs, including a new `PUT /api/echo` added just to demonstrate `request.put()` |
| `APIRequestContext` | The `request` fixture, plus a standalone one via `request.newContext()` (imported from `@playwright/test`, no test fixture involved) |

**Configuration, projects, execution**
| Topic | Where |
|---|---|
| Projects, setup projects | `setup` + `chromium` in `playwright.config.ts` |
| Parallel execution | `fullyParallel: true`; kept at `workers: 1` because the app's sessions/cart/flaky-counter live in server memory — see the comment in `playwright.config.ts` |
| Sharding | Not wired to an npm script (it's normally CI-parameterized). Usage: `npx playwright test --shard=1/3` |
| Retries | `playwright.ci.config.ts` sets `retries: 2`; default config keeps `retries: 0` so local failures aren't masked |
| Timeouts | Explicit `timeout`/`expect.timeout` in `playwright.config.ts`; `test.slow()` and `test.setTimeout()` for per-test overrides (16-runner-and-fixtures.spec.ts) |
| Environment management | `BASE_URL` env var overrides `baseURL` in `playwright.config.ts`; `playwright.ci.config.ts` is a second, separate environment (headless + retries) |
| Test data management | [tests/support/testData.ts](tests/support/testData.ts) |
| Page Object Model, component/element abstraction | [tests/pages/LoginPage.ts](tests/pages/LoginPage.ts), [tests/pages/CatalogPage.ts](tests/pages/CatalogPage.ts), [tests/pages/CartPage.ts](tests/pages/CartPage.ts) |
| Data-driven testing | [tests/18-data-driven-api.spec.ts](tests/18-data-driven-api.spec.ts) — loops generating one `test()` per data row, both API and UI |
| Test tags, test filtering | `{ tag: '@smoke' }` etc.; filter with `--grep`, `--project`, or a file path. See `npm run test:smoke` |
| Codegen | `npm run test:codegen` → `npx playwright codegen http://localhost:3000` |
| Reports | HTML/JSON/JUnit reporters, already configured; `npm run report` opens the latest HTML report |

All of the npm scripts referenced above are listed under [Running the tests](#running-the-tests).
