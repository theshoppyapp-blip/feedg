import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import Price from '../models/Price';
import Product from '../models/Product';
import Store from '../models/Store';

function parsePrice(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function parseEntriesFromHtml(html, source) {
  const $ = cheerio.load(html);
  const entries = [];

  $(source.rowSelector).each((_, element) => {
    const row = $(element);
    const nameText = normalizeName(row.find(source.nameSelector).first().text());
    const priceText = normalizeName(row.find(source.priceSelector).first().text());
    const price = parsePrice(priceText);
    const unit = source.unitSelector
      ? normalizeName(row.find(source.unitSelector).first().text())
      : normalizeName(source.unit || 'unit');

    if (!nameText || price == null) return;

    entries.push({
      storeName: source.storeName,
      storeLocation: source.storeLocation || '',
      productName: nameText,
      price,
      unit: unit || 'unit',
      category: source.category || 'general',
    });
  });

  return entries;
}

async function runBrowserSteps(page, steps = []) {
  for (const step of steps) {
    if (step.action === 'goto') {
      await page.goto(step.url, { waitUntil: step.waitUntil || 'domcontentloaded' });
      continue;
    }

    if (step.action === 'click') {
      await page.locator(step.selector).first().click();
      continue;
    }

    if (step.action === 'fill') {
      await page.locator(step.selector).first().fill(String(step.value || ''));
      continue;
    }

    if (step.action === 'press') {
      await page.locator(step.selector).first().press(step.key || 'Enter');
      continue;
    }

    if (step.action === 'waitForSelector') {
      await page.waitForSelector(step.selector, { timeout: step.timeout || 15000 });
      continue;
    }

    if (step.action === 'waitForTimeout') {
      await page.waitForTimeout(step.timeout || 1000);
      continue;
    }

    throw new Error(`Unsupported browser step action: ${step.action}`);
  }
}

function buildPageUrl(baseUrl, pageNum) {
  const url = new URL(baseUrl);
  url.searchParams.set('pg', String(pageNum));
  return url.toString();
}

async function fetchBrowserSource(source) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: source.headless !== false,
    channel: source.channel,
    args: source.launchArgs || undefined,
  });

  try {
    const context = await browser.newContext({
      userAgent: source.userAgent || 'Mozilla/5.0 (compatible; ShoppyPriceBot/1.0; +https://localhost)',
      extraHTTPHeaders: source.headers || undefined,
      storageState: source.storageState || source.storageStatePath || undefined,
    });
    const page = await context.newPage();

    const maxPages = source.maxPages || 1;
    const allEntries = [];

    for (let pg = 1; pg <= maxPages; pg++) {
      const pageUrl = maxPages > 1 ? buildPageUrl(source.url, pg) : source.url;

      await page.goto(pageUrl, { waitUntil: source.waitUntil || 'domcontentloaded' });

      if (pg === 1 && Array.isArray(source.steps) && source.steps.length > 0) {
        await runBrowserSteps(page, source.steps);
      }

      // Wait for products or detect end of pagination
      try {
        await page.waitForSelector(source.waitForSelector || source.rowSelector, {
          timeout: source.timeout || 20000,
        });
      } catch {
        // No products on this page — stop paginating
        console.log(`  → page ${pg}: no products found, stopping pagination`);
        break;
      }

      if (source.delayMs) {
        await page.waitForTimeout(source.delayMs);
      }

      const title = await page.title();

      if (title.includes('Just a moment')) {
        throw new Error('Paknsave challenge page detected. Capture a real browser session first and set storageStatePath in scraper.sources.json.');
      }

      const html = await page.content();

      if (pg === 1 && source.debugHtmlPath) {
        await fs.writeFile(source.debugHtmlPath, html, 'utf8');
      }

      const entries = parseEntriesFromHtml(html, source);
      if (entries.length === 0) {
        console.log(`  → page ${pg}: 0 products, stopping pagination`);
        break;
      }

      console.log(`  → page ${pg}: ${entries.length} products`);
      allEntries.push(...entries);
    }

    if (source.saveStorageStatePath) {
      await context.storageState({ path: source.saveStorageStatePath });
    }

    return allEntries;
  } finally {
    await browser.close();
  }
}

async function fetchSource(source) {
  if (source.engine === 'playwright') {
    return fetchBrowserSource(source);
  }

  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ShoppyPriceBot/1.0; +https://localhost)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
  }

  const html = await response.text();
  return parseEntriesFromHtml(html, source);
}

export async function scrapePriceSources(sources) {
  const results = [];

  for (const source of sources) {
    try {
      const entries = await fetchSource(source);
      results.push(...entries);
      console.log(`✓ ${source.storeName}: scraped ${entries.length} rows`);
    } catch (error) {
      console.warn(`⚠ ${source.storeName}: ${error.message}`);
    }
  }

  return results;
}

export async function saveScrapedPrices(entries, { dryRun = false } = {}) {
  const storeCache = new Map();
  const productCache = new Map();

  let insertedOrUpdated = 0;

  for (const item of entries) {
    let store = storeCache.get(item.storeName);
    if (!store) {
      store = await Store.findOneAndUpdate(
        { name: item.storeName },
        {
          $setOnInsert: {
            name: item.storeName,
            location: item.storeLocation || '',
            type: 'supermarket',
          },
          $set: {
            location: item.storeLocation || '',
          },
        },
        { new: true, upsert: true }
      );
      storeCache.set(item.storeName, store);
    }

    const productKey = item.productName.toLowerCase();
    let product = productCache.get(productKey);
    if (!product) {
      product = await Product.findOneAndUpdate(
        { name: item.productName },
        {
          $setOnInsert: {
            name: item.productName,
            category: item.category || 'general',
            unit: item.unit || 'unit',
          },
        },
        { new: true, upsert: true }
      );
      productCache.set(productKey, product);
    }

    if (dryRun) continue;

    await Price.findOneAndUpdate(
      {
        storeId: store._id,
        productId: product._id,
        source: 'scraped',
      },
      {
        $set: {
          price: item.price,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    insertedOrUpdated += 1;
  }

  return {
    totalEntries: entries.length,
    insertedOrUpdated,
    dryRun,
  };
}
