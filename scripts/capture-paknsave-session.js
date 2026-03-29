import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright';

const rootDir = path.resolve(process.cwd());
const tmpDir = path.join(rootDir, 'tmp');
const storageStatePath = path.join(tmpDir, 'paknsave-storage.json');
const debugHtmlPath = path.join(tmpDir, 'paknsave-live.html');
const targetUrl = 'https://www.paknsave.co.nz/';

async function main() {
  await fs.mkdir(tmpDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Hide automation signals
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  console.log('Opening Pak n Save in Brave...');
  console.log('');
  console.log('Steps:');
  console.log('  1. Complete any Cloudflare/anti-bot check if it appears');
  console.log('  2. Select your store (e.g. Pak\'nSave Sylvia Park)');
  console.log('  3. Navigate to: Shop → Fruit & Vegetables (or any category)');
  console.log('  4. Wait until products are fully visible on screen');
  console.log('  5. Come back here and press Enter');
  console.log('');

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