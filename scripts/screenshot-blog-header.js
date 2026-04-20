const puppeteer = require(require('path').resolve(__dirname, '../frontend/node_modules/puppeteer'));
const path = require('path');
const fs = require('fs');

const DIST = path.resolve(__dirname, '../frontend/dist/triply/browser');
const OUT = path.resolve(__dirname, '../blog-preview');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 700, deviceScaleFactor: 2 });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('clarity.ms') || url.includes('googletagmanager') || url.includes('google-analytics')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  const pages = [
    { file: 'blog/index.html', name: 'header-listing' },
    { file: 'blog/roteiro-7-dias-paris/index.html', name: 'header-post' },
  ];

  for (const p of pages) {
    const url = `file:///${path.join(DIST, p.file).replace(/\\/g, '/')}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(OUT, `${p.name}.png`), fullPage: false });
    console.log(`✓ ${p.name}`);
  }

  await browser.close();
})();
