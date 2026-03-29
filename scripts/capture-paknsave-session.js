import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright';

const rootDir = path.resolve(process.cwd());
const tmpDir = path.join(rootDir, 'tmp');
const storageStatePath = path.join(tmpDir, 'paknsave-storage.json');
const debugHtmlPath = path.join(tmpDir, 'paknsave-live.html');
const targetUrl = 'https://www.paknsave.co.nz/shop/search/products?search=chicken';

async function main() {
  await fs.mkdir(tmpDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    channel: 'chromium',
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Opening Pak n Save in a real browser...');
  console.log('Complete any anti-bot check, choose your store, and leave the browser on a product results page.');
  console.log(`Target page: ${targetUrl}`);

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const rl = readline.createInterface({ input, output });
  await rl.question('Press Enter here once the page is fully loaded and products are visible in the browser... ');
  rl.close();

  await context.storageState({ path: storageStatePath });
  await fs.writeFile(debugHtmlPath, await page.content(), 'utf8');

  console.log(`Saved storage state to ${storageStatePath}`);
  console.log(`Saved rendered HTML to ${debugHtmlPath}`);

  await browser.close();
}

main().catch((error) => {
  console.error('Failed to capture Pak n Save session:', error.message);
  process.exit(1);
});