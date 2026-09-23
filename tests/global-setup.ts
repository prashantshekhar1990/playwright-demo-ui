import * as fs from 'fs';
import * as path from 'path';

// Runs exactly once for the whole `npx playwright test` invocation, before any project (including
// the `setup` project) starts. Different from a `setup` project: this has no browser and can't
// depend on other projects — it's for run-wide bookkeeping, not app-specific logins.
//
// This one records when the run started and makes it available to tests via an env var, then
// writes a marker file next to this run's report. It deliberately does not talk to the app server
// — Playwright's `webServer`/project startup order isn't something to depend on here.
export default async function globalSetup() {
  const startedAt = new Date().toISOString();
  process.env.GLOBAL_SETUP_AT = startedAt;

  const runId = process.env.RUN_ID || 'unspecified-run';
  // config.rootDir resolves to testDir (tests/), not the project root, so build the path off this
  // file's own location instead — same approach global-teardown.ts already uses.
  const outDir = path.join(__dirname, '..', 'output', runId);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'run-info.json'), JSON.stringify({ runId, startedAt, node: process.version }, null, 2));

  console.log(`[global-setup] run "${runId}" started at ${startedAt}`);
}
