const { readdirSync, existsSync } = require('fs');
const { spawnSync } = require('child_process');
const { join } = require('path');

const outputDir = join(__dirname, '..', 'output');
if (!existsSync(outputDir)) {
  console.error('No output/ folder yet — run `npm test` first.');
  process.exit(1);
}

// Run IDs are timestamps, so lexical sort puts the newest last.
const latest = readdirSync(outputDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(outputDir, e.name, 'html-report')))
  .map((e) => e.name)
  .sort()
  .pop();

if (!latest) {
  console.error('No HTML report found under output/.');
  process.exit(1);
}

spawnSync('npx', ['playwright', 'show-report', join(outputDir, latest, 'html-report')], {
  stdio: 'inherit',
  shell: true,
});
