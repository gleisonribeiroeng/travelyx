const puppeteer = require(require('path').resolve(__dirname, '../frontend/node_modules/puppeteer'));
const path = require('path');

const DIST = path.resolve(__dirname, '../frontend/dist/triply/browser');
const OUT = path.resolve(__dirname, '../blog-preview');
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  { file: 'blog/index.html', name: 'listing' },
  { file: 'blog/roteiro-7-dias-paris/index.html', name: 'post' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });

  for (const p of pages) {
    const url = `file:///${path.join(DIST, p.file).replace(/\\/g, '/')}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 500));
    const out = path.join(OUT, `${p.name}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`✓ ${p.name} → ${out}`);
  }

  await browser.close();
})();
