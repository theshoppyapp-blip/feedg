import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { scrapePriceSources, saveScrapedPrices } from '@/lib/scraper/priceScraper';

export const runtime = 'nodejs';

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token === secret;
}

async function loadSources() {
  const configPath = path.join(process.cwd(), 'scraper.sources.json');
  const raw = await fs.readFile(configPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
    throw new Error('scraper.sources.json must contain a non-empty sources array');
  }

  return parsed.sources;
}

function applySessionStateFromEnv(sources) {
  const rawStorageState = process.env.PAKNSAVE_STORAGE_STATE_JSON;
  if (!rawStorageState) return sources;

  let parsedStorageState;
  try {
    parsedStorageState = JSON.parse(rawStorageState);
  } catch {
    throw new Error('PAKNSAVE_STORAGE_STATE_JSON is not valid JSON');
  }

  return sources.map((source) => {
    if (source.storeName !== 'Paknsave' || source.engine !== 'playwright') {
      return source;
    }

    const nextSource = {
      ...source,
      storageState: parsedStorageState,
    };

    delete nextSource.storageStatePath;
    return nextSource;
  });
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sources = applySessionStateFromEnv(await loadSources());
    const headlessSources = sources.map((source) => ({
      ...source,
      headless: true,
    }));

    const entries = await scrapePriceSources(headlessSources);

    await dbConnect();
    const summary = await saveScrapedPrices(entries);

    return NextResponse.json({
      ok: true,
      totalEntries: entries.length,
      summary,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Scrape failed',
      },
      { status: 500 }
    );
  }
}
