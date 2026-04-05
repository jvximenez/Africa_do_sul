#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, devices } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const server = http.createServer((req, res) => {
  let u = (req.url || '/').split('?')[0];
  if (u === '/') u = '/index.html';
  const fp = path.join(root, u.replace(/^\//, ''));
  if (!fp.startsWith(root)) {
    res.statusCode = 403;
    return res.end();
  }
  fs.readFile(fp, (err, buf) => {
    if (err) {
      res.statusCode = 404;
      return res.end();
    }
    res.end(buf);
  });
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/index.html`;

const browser = await chromium.launch();
const page = await browser.newPage({
  ...devices['iPhone 13'],
});
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForSelector('.leaflet-container', { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(400);

const m = await page.evaluate(() => {
  const mw = document.getElementById('map-wrap');
  const mEl = document.getElementById('map');
  const hdr = document.getElementById('hdr');
  const app = document.getElementById('app');
  const lc = mEl && mEl.querySelector('.leaflet-container');
  const mwR = mw.getBoundingClientRect();
  const hdrR = hdr.getBoundingClientRect();
  const appR = app.getBoundingClientRect();
  return {
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    gapMapHdr: Math.round((hdrR.top - mwR.bottom) * 100) / 100,
    mapWrapBottom: Math.round(mwR.bottom * 100) / 100,
    hdrTop: Math.round(hdrR.top * 100) / 100,
    mapWrapOffsetH: mw.offsetHeight,
    mapOffsetH: mEl.offsetHeight,
    leafletOffsetH: lc ? lc.offsetHeight : null,
    innerGap: lc ? mw.offsetHeight - lc.offsetHeight : null,
    appBottom: Math.round(appR.bottom * 100) / 100,
    gapBelowApp: Math.round((window.innerHeight - appR.bottom) * 100) / 100,
  };
});

console.log(JSON.stringify(m, null, 2));
await browser.close();
server.close();
