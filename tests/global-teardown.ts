import * as fs from 'fs';
import * as path from 'path';

// Runs exactly once after every project has finished, pass or fail. Pairs with global-setup.ts.
export default async function globalTeardown() {
  const startedAt = process.env.GLOBAL_SETUP_AT;
  const durationMs = startedAt ? Date.now() - new Date(startedAt).getTime() : null;
  console.log(`[global-teardown] run finished${durationMs !== null ? ` in ${(durationMs / 1000).toFixed(1)}s` : ''}`);

  const runId = process.env.RUN_ID;
  if (!runId) return;
  const infoPath = path.join(__dirname, '..', 'output', runId, 'run-info.json');
  if (!fs.existsSync(infoPath)) return;
  const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
  fs.writeFileSync(infoPath, JSON.stringify({ ...info, finishedAt: new Date().toISOString(), durationMs }, null, 2));
}
