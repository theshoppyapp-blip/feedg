import * as cheerio from 'cheerio';
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

async function fetchSource(source) {
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
