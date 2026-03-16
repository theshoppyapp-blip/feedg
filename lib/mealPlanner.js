import Price from '@/lib/models/Price';
import Recipe from '@/lib/models/Recipe';
import Store from '@/lib/models/Store';
import UserSubmittedPrice from '@/lib/models/UserSubmittedPrice';
import mongoose from 'mongoose';

function normalizeTag(input) {
  const value = (input || '').trim().toLowerCase();
  if (value === 'high-protein' || value === 'high protein') return 'high protein';
  if (value === 'student' || value === 'student-budget' || value === 'student budget') return 'student budget';
  if (value === 'veggie') return 'vegetarian';
  return value || 'healthy';
}

function toObjectIdString(value) {
  return value.toString();
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function normalizeList(values = []) {
  return values
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getRecipePreferenceScore(recipe, likedFoods) {
  if (likedFoods.length === 0) return 0;

  const haystacks = [
    recipe.name,
    ...(recipe.tags || []),
    ...((recipe.ingredients || []).map((ingredient) => ingredient.productId?.name || '')),
  ]
    .join(' ')
    .toLowerCase();

  return likedFoods.reduce((score, item) => (haystacks.includes(item) ? score + 1 : score), 0);
}

function matchesPreferredShop(storeName, likedShops) {
  const normalizedName = normalizeText(storeName);
  return likedShops.some((shop) => normalizedName.includes(shop) || shop.includes(normalizedName));
}

function getStorePreferenceScore(store, likedShops, userLocation) {
  let score = 0;

  if (matchesPreferredShop(store.storeName, likedShops)) {
    score += 2;
  }

  const preferredLocation = normalizeText(userLocation);
  const storeLocation = normalizeText(store.storeLocation);
  if (preferredLocation && storeLocation.includes(preferredLocation)) {
    score += 1;
  }

  return score;
}

function pickRecipes(recipes, targetCount) {
  if (recipes.length === 0) return [];
  const list = [];
  for (let i = 0; i < targetCount; i += 1) {
    list.push(recipes[i % recipes.length]);
  }
  return list;
}

export async function generateMealPlan({ budget, people, foodType, dietaryRestrictions = [], likedFoods = [], likedShops = [], userLocation = '' }) {
  const normalizedFoodType = normalizeTag(foodType);
  const restrictions = normalizeList(dietaryRestrictions);
  const preferredFoods = normalizeList(likedFoods);
  const preferredShops = normalizeList(likedShops);
  const preferredLocation = String(userLocation || '').trim();

  const recipeFilter = {
    status: 'approved',
  };

  if (normalizedFoodType) {
    recipeFilter.tags = normalizedFoodType;
  }

  const matchedRecipes = await Recipe.find(recipeFilter)
    .populate('ingredients.productId')
    .lean();

  const allApprovedRecipes = matchedRecipes.length > 0
    ? matchedRecipes
    : await Recipe.find({ status: 'approved' }).populate('ingredients.productId').lean();

  const recipes = allApprovedRecipes.filter((recipe) => {
    if (restrictions.length === 0) return true;
    if (restrictions.includes('vegetarian') && !recipe.tags.includes('vegetarian')) return false;
    return true;
  });

  const rankedRecipes = [...recipes].sort((a, b) => {
    const scoreDiff = getRecipePreferenceScore(b, preferredFoods) - getRecipePreferenceScore(a, preferredFoods);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });

  const weeklyRecipes = pickRecipes(rankedRecipes, 7);

  const shoppingMap = new Map();
  for (const recipe of weeklyRecipes) {
    for (const ingredient of recipe.ingredients || []) {
      if (!ingredient.productId?._id) continue;
      const productId = toObjectIdString(ingredient.productId._id);
      const key = `${productId}:${ingredient.unit}`;
      const existing = shoppingMap.get(key);

      const scaledQuantity = (Number(ingredient.quantity) || 0) * Math.max(1, Number(people) / Number(recipe.servings || 1));

      if (existing) {
        existing.quantity += scaledQuantity;
      } else {
        shoppingMap.set(key, {
          productId,
          productName: ingredient.productId.name,
          quantity: scaledQuantity,
          unit: ingredient.unit,
        });
      }
    }
  }

  const shoppingList = [...shoppingMap.values()]
    .map((item) => ({ ...item, quantity: roundCurrency(item.quantity) }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const productIds = shoppingList.map((item) => item.productId);
  const [stores, basePrices, userPriceAgg] = await Promise.all([
    Store.find().lean(),
    Price.find({ productId: { $in: productIds } }).lean(),
    UserSubmittedPrice.aggregate([
      { $match: { productId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      {
        $group: {
          _id: { storeId: '$storeId', productId: '$productId' },
          avgPrice: { $avg: '$price' },
          submissions: { $sum: 1 },
        },
      },
    ]),
  ]);

  const scrapedMap = new Map();
  for (const price of basePrices) {
    const key = `${toObjectIdString(price.storeId)}:${toObjectIdString(price.productId)}`;
    const existing = scrapedMap.get(key) || { total: 0, count: 0 };
    existing.total += Number(price.price);
    existing.count += 1;
    scrapedMap.set(key, existing);
  }

  const userMap = new Map();
  for (const row of userPriceAgg) {
    const key = `${toObjectIdString(row._id.storeId)}:${toObjectIdString(row._id.productId)}`;
    userMap.set(key, { avgPrice: Number(row.avgPrice), submissions: Number(row.submissions) });
  }

  const estimatedCosts = stores
    .map((store) => {
      let total = 0;
      for (const item of shoppingList) {
        const key = `${toObjectIdString(store._id)}:${item.productId}`;
        const scraped = scrapedMap.get(key);
        const user = userMap.get(key);

        let unitPrice = null;
        if (scraped && user) {
          const scrapedAvg = scraped.total / scraped.count;
          unitPrice = (scrapedAvg + user.avgPrice) / 2;
        } else if (user) {
          unitPrice = user.avgPrice;
        } else if (scraped) {
          unitPrice = scraped.total / scraped.count;
        }

        if (unitPrice != null) {
          total += unitPrice * item.quantity;
        }
      }

      return {
        storeId: toObjectIdString(store._id),
        storeName: store.name,
        storeLocation: store.location || '',
        total: roundCurrency(total),
      };
    })
    .sort((a, b) => a.total - b.total);

  const recommendation = [...estimatedCosts]
    .sort((a, b) => {
      const scoreDiff = getStorePreferenceScore(b, preferredShops, preferredLocation) - getStorePreferenceScore(a, preferredShops, preferredLocation);
      if (scoreDiff !== 0) return scoreDiff;
      return a.total - b.total;
    })[0]
    || null;

  return {
    budget: Number(budget),
    people: Number(people),
    foodType: normalizedFoodType,
    dietaryRestrictions: restrictions,
    likedFoods: preferredFoods,
    likedShops: preferredShops,
    userLocation: preferredLocation,
    meals: weeklyRecipes.map((recipe) => recipe.name),
    shoppingList,
    estimatedCosts,
    recommendation,
    budgetFit: recommendation ? recommendation.total <= Number(budget) : null,
  };
}
