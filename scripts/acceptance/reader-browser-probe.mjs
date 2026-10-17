// Controller baseline: an existing browser on an isolated blank page, not I UI.
import assert from 'node:assert/strict';
import { openBrowser } from '../browser-lab.mjs';
const browser = await openBrowser({ width: 900, height: 800 });
try {
  assert.equal(await browser.evaluate('location.href'), 'about:blank');
  assert.equal(await browser.evaluate('innerWidth'), 900);
  console.log(JSON.stringify({ status: 'passed', blankPageOnly: true, productTested: false }));
} finally { await browser.close(); }
