# Playwright Demo UI

A small practice web application for learning and demonstrating UI test automation with [Playwright](https://playwright.dev). It contains 15 scenario pages (forms, frames, popups, tables, file upload, authentication, network mocking, and more) and a matching Playwright test suite written in TypeScript.

- **App:** an Express server (`server.js`) that serves static HTML pages from `public/` plus a few small JSON APIs (login, users table, file upload/download, slow and flaky endpoints).
- **Tests:** Playwright specs in `tests/`, one file per scenario (`01-basic.spec.ts` … `15-complex.spec.ts`).

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

Supporting pages (not on the home page): `/pages/dashboard.html` (a login-protected page used by the auth tests), `/pages/tab-level.html`, `/pages/popup-child.html`, `/pages/frame-outer.html` and `/pages/frame-content.html` (targets opened or embedded by the pages above).

### Demo credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |
| `user` | `user123` | user |
| `locked` | *(anything)* | always returns 403 "Account locked" |

## Running the tests

```bash
npm test
```

This runs the full suite with Chromium. Playwright starts the app automatically before the tests (`npm start`), or reuses it if it is already running on port 3000.

Useful variations:

```bash
npm run test:ui                                # interactive Playwright UI mode
npx playwright test tests/08-tables.spec.ts    # a single spec file
npx playwright test -g "drag and drop"         # tests whose title matches
```

Notes on how the suite is configured (see [playwright.config.ts](playwright.config.ts)):

- Tests run **headed** (a visible browser window) with a single worker, because the auth and flaky-endpoint scenarios rely on server state. To run headless, change `headless: false` to `true` in the config.
- To use an already-installed Chromium instead of the Playwright download, set the `CHROMIUM_PATH` environment variable to its executable path.

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
public/            Static pages (index.html, pages/*.html) and shared assets
server.js          Express server and JSON APIs
tests/             Playwright specs, one per scenario
scripts/           Helper scripts (show-latest-report.js)
playwright.config.ts
```
