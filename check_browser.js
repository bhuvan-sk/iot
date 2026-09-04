import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', e => console.error('WINDOW_ERROR:', e.message, e.filename, e.lineno));
    window.addEventListener('unhandledrejection', e => console.error('UNHANDLED_REJECTION:', e.reason));
  });
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST_FAILED:', request.url(), request.failure().errorText));
  page.on('response', response => {
    if (!response.ok()) console.log('RESPONSE_ERROR:', response.url(), response.status());
  });
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const html = await page.evaluate(() => document.body.outerHTML);
  console.log('HTML:', html);
  
  await browser.close();
})();
