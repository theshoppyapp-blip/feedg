import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Price from '@/lib/models/Price';
import Product from '@/lib/models/Product';
import Store from '@/lib/models/Store';
import UserSubmittedPrice from '@/lib/models/UserSubmittedPrice';
import { ensureMvpSeedData } from '@/lib/bootstrapData';

function toObjectId(value) {
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    await dbConnect();
    await ensureMvpSeedData();

    const { searchParams } = new URL(request.url);
    const rawProductIds = (searchParams.get('productIds') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const productIds = rawProductIds.map(toObjectId).filter(Boolean);
    const storeId = toObjectId(searchParams.get('storeId'));

    const priceFilter = {};
    const userFilter = {};

    if (productIds.length > 0) {
      priceFilter.productId = { $in: productIds };
      userFilter.productId = { $in: productIds };
    }

    if (storeId) {
      priceFilter.storeId = storeId;
      userFilter.storeId = storeId;
    }

    const [products, stores, scrapedRows, userRows] = await Promise.all([
      Product.find(productIds.length > 0 ? { _id: { $in: productIds } } : {}).lean(),
      Store.find(storeId ? { _id: storeId } : {}).lean(),
      Price.find(priceFilter).lean(),
      UserSubmittedPrice.aggregate([
        { $match: userFilter },
        {
          $group: {
            _id: { storeId: '$storeId', productId: '$productId' },
            avgPrice: { $avg: '$price' },
            submissions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const storeMap = new Map(stores.map((store) => [store._id.toString(), store]));

    const scrapedMap = new Map();
    for (const row of scrapedRows) {
      const key = `${row.storeId.toString()}:${row.productId.toString()}`;
      const entry = scrapedMap.get(key) || { total: 0, count: 0 };
      entry.total += Number(row.price);
      entry.count += 1;
      scrapedMap.set(key, entry);
    }

    const userMap = new Map();
    for (const row of userRows) {
      const key = `${row._id.storeId.toString()}:${row._id.productId.toString()}`;
      userMap.set(key, {
        avgPrice: Number(row.avgPrice),
        submissions: Number(row.submissions),
      });
    }

    const responseRows = [];

    for (const store of stores) {
      for (const product of products) {
        const key = `${store._id.toString()}:${product._id.toString()}`;
        const scraped = scrapedMap.get(key);
        const user = userMap.get(key);

        let blendedPrice = null;
        if (scraped && user) {
          blendedPrice = ((scraped.total / scraped.count) + user.avgPrice) / 2;
        } else if (user) {
          blendedPrice = user.avgPrice;
        } else if (scraped) {
          blendedPrice = scraped.total / scraped.count;
        }

        if (blendedPrice != null) {
          responseRows.push({
            storeId: store._id.toString(),
            storeName: store.name,
            productId: product._id.toString(),
            productName: product.name,
            unit: product.unit,
            estimatedPrice: Math.round(blendedPrice * 100) / 100,
            communitySubmissions: user?.submissions || 0,
          });
        }
      }
    }

    return NextResponse.json({
      prices: responseRows,
      stores: [...storeMap.values()].map((store) => ({
        id: store._id.toString(),
        name: store.name,
      })),
      products: [...productMap.values()].map((product) => ({
        id: product._id.toString(),
        name: product.name,
        unit: product.unit,
      })),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Get prices error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
