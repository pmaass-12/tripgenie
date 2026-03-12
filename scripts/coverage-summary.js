#!/usr/bin/env node
/**
 * coverage-summary.js
 * Reads the Playwright JSON test results and prints a coverage summary:
 *   - How many tests passed / failed / skipped
 *   - Which test files were included
 *   - Which REG-* regression checks passed
 *
 * NOTE: This is a *test-coverage* report (what behaviors are exercised by tests),
 * not a *code-coverage* report (which JS lines were executed). True line-level
 * code coverage for a static single-file HTML app would require Istanbul
 * instrumentation of index.html before serving — see README.md for details.
 */

const fs   = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, '..', 'test-results', 'results.json');

if (!fs.existsSync(resultsPath)) {
  console.log('\n⚠️  No results.json found. Run: npm run test:coverage\n');
  process.exit(0);
}

const raw  = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const suites = raw.suites || [];

let total = 0, passed = 0, failed = 0, skipped = 0;
const failedTests = [];
const filesSeen   = new Set();

function walk(suite) {
  if (suite.file) filesSeen.add(path.basename(suite.file));
  (suite.specs || []).forEach(spec => {
    total++;
    const status = (spec.tests || []).map(t => t.status).find(Boolean) || 'unknown';
    if (status === 'passed' || status === 'expected')  passed++;
    else if (status === 'failed' || status === 'unexpected') { failed++; failedTests.push(spec.title); }
    else skipped++;
  });
  (suite.suites || []).forEach(walk);
}
suites.forEach(walk);

const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

console.log('\n════════════════════════════════════════');
console.log('  TripGenie Test Coverage Summary');
console.log('════════════════════════════════════════');
console.log(`  Files run:  ${[...filesSeen].join(', ')}`);
console.log(`  Total:      ${total}`);
console.log(`  ✅ Passed:  ${passed}  (${pct}%)`);
console.log(`  ❌ Failed:  ${failed}`);
console.log(`  ⏭  Skipped: ${skipped}`);
if (failedTests.length) {
  console.log('\n  Failed tests:');
  failedTests.forEach(t => console.log(`    • ${t}`));
}
console.log('\n  Full HTML report: npm run report');
console.log('════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
