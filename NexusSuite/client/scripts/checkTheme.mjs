import puppeteer from 'puppeteer';

async function main() {
  const url = process.env.CHECK_URL || 'https://nexus-suite-eight.vercel.app/';
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setViewport({ width: 1280, height: 800 });

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Wait for app root render
  try {
    await page.waitForSelector('#root', { timeout: 15000 });
  } catch (_) {}

  // Try to wait for hero heading if present
  try {
    await page.waitForFunction(
      () => document.querySelector('#root')?.textContent?.includes('Esports'),
      { timeout: 15000 }
    );
  } catch (_) {}

  const info = await page.evaluate(() => {
    const htmlClass = document.documentElement.className;
    const designTheme = localStorage.getItem('design:theme');
    const rootStyle = getComputedStyle(document.documentElement);
    const primary = rootStyle.getPropertyValue('--primary');
    const accent = rootStyle.getPropertyValue('--accent');
    const brand = rootStyle.getPropertyValue('--sidebar-accent');
    const title = document.title;
    // Grab first H1 color if exists
    const h1 = document.querySelector('h1, .text-6xl, .text-5xl');
    const h1Color = h1 ? getComputedStyle(h1).color : null;
    return { htmlClass, designTheme, primary, accent, brand, title, h1Color };
  });

  await page.screenshot({ path: 'theme-check.png', fullPage: true });
  console.log(JSON.stringify({ url, info, screenshot: 'theme-check.png' }, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error('CHECK_FAILED', err);
  process.exit(1);
});

