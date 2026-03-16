import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const rootDir = path.resolve(process.cwd());
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const configPath = path.join(rootDir, 'scraper.sources.json');
const isDryRun = process.argv.includes('--dry-run');

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error('Missing scraper.sources.json. Copy scraper.sources.example.json to scraper.sources.json and edit it.');
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
    throw new Error('scraper.sources.json must contain a non-empty "sources" array.');
  }

  return parsed.sources;
}

async function main() {
  console.log('Starting price scrape...');

  const { saveScrapedPrices, scrapePriceSources } = await import('../lib/scraper/priceScraper');

  const sources = loadConfig();

  const entries = await scrapePriceSources(sources);

  if (isDryRun) {
    console.log('Dry run completed.');
    console.log({ totalEntries: entries.length, sample: entries.slice(0, 5) });
    return;
  }

  const { default: dbConnect } = await import('../lib/mongodb');
  await dbConnect();

  const summary = await saveScrapedPrices(entries, { dryRun: isDryRun });

  console.log('Done.');
  console.log(summary);
}

main().catch((error) => {
  console.error('Price scrape failed:', error.message);
  process.exit(1);
});
