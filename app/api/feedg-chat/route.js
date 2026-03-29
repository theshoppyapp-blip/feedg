import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ensureMvpSeedData } from '@/lib/bootstrapData';
import { generateMealPlan } from '@/lib/mealPlanner';
import { generateFallbackMealPlan } from '@/lib/fallbackMealPlanner';

function inferBudget(message) {
  const dollarMatch = message.match(/\$\s*(\d+(?:\.\d+)?)/i);
  if (dollarMatch) return Number(dollarMatch[1]);

  const underMatch = message.match(/under\s*(\d+(?:\.\d+)?)/i);
  if (underMatch) return Number(underMatch[1]);

  return 35;
}

function inferPeople(message) {
  const familyMatch = message.match(/family\s+of\s+(\d+)/i);
  if (familyMatch) return Number(familyMatch[1]);

  const forMatch = message.match(/for\s+(\d+)\s*(people|person|adults|kids|whanau|whanau\b)?/i);
  if (forMatch) return Number(forMatch[1]);

  const servesMatch = message.match(/(\d+)\s*(people|person|adults|kids)/i);
  if (servesMatch) return Number(servesMatch[1]);

  return 2;
}

function inferFoodType(message) {
  const lower = message.toLowerCase();
  if (lower.includes('vege') || lower.includes('vegetarian')) return 'vegetarian';
  if (lower.includes('protein')) return 'high protein';
  if (lower.includes('student')) return 'student budget';
  return 'healthy';
}

function inferDietaryRestrictions(message) {
  const lower = message.toLowerCase();
  const restrictions = [];

  if (lower.includes('vegetarian') || lower.includes('vege')) restrictions.push('vegetarian');
  if (lower.includes('vegan')) restrictions.push('vegan');
  if (lower.includes('plant based') || lower.includes('plant-based')) restrictions.push('vegan');
  if (lower.includes('gluten free') || lower.includes('gluten-free')) restrictions.push('gluten free');
  if (lower.includes('no gluten')) restrictions.push('gluten free');
  if (lower.includes('dairy free') || lower.includes('dairy-free')) restrictions.push('dairy free');
  if (lower.includes('no dairy')) restrictions.push('dairy free');

  return [...new Set(restrictions)];
}

function inferLikedFoods(message) {
  const lower = message.toLowerCase();
  const candidates = [
    'chicken',
    'tofu',
    'lentils',
    'rice',
    'oats',
    'banana',
    'eggs',
    'spinach',
    'tomato',
  ];

  const expanded = [
    ...candidates,
    'drumsticks',
    'pasta',
    'broccoli',
    'cream',
    'onion',
  ];

  return expanded.filter((item) => lower.includes(item));
}

function inferLikedShops(message) {
  const lower = message.toLowerCase();
  const shops = [];

  if (lower.includes('paknsave') || lower.includes("pak'nsave") || lower.includes('pak n save')) shops.push('paknsave');
  if (lower.includes('new world')) shops.push('new world');
  if (lower.includes('countdown') || lower.includes('woolworths')) shops.push('woolworths');
  if (lower.includes('local market')) shops.push('local market');

  return shops;
}

function inferLocation(message) {
  const knownCities = ['auckland', 'wellington', 'christchurch', 'hamilton', 'dunedin', 'tauranga'];
  const lower = message.toLowerCase();
  const city = knownCities.find((name) => lower.includes(name));
  return city || '';
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function buildReply(prompt, plan, fallbackMode) {
  const topMeals = (plan.meals || []).slice(0, 4).join(', ');
  const topItems = (plan.shoppingList || [])
    .slice(0, 6)
    .map((item) => `${item.productName} (${item.quantity} ${item.unit})`)
    .join(', ');

  const bestShop = plan.recommendation
    ? `${plan.recommendation.storeName} at $${formatMoney(plan.recommendation.total)}`
    : 'No clear best shop yet';

  const budgetLine = plan.budgetFit === true
    ? `🎯 Yep, you're right in at $${formatMoney(plan.recommendation?.total || plan.budget)}.`
    : `⚠️ That's about $${formatMoney(plan.recommendation?.total || plan.budget)} — a bit over $${formatMoney(plan.budget)}. Swap chicken breast for drumsticks or trim portions to stay under.`;

  const modeLine = fallbackMode
    ? 'Using starter pricing data right now while live store data is unavailable.'
    : 'Using current live pricing and approved recipes.';

  const assumptionsLine = `Assumed inputs -> budget: $${formatMoney(plan.budget)}, people: ${plan.people}, preferences: ${[plan.foodType, ...(plan.dietaryRestrictions || [])].filter(Boolean).join(', ') || 'none'}.`;

  return [
    `Feed G check for: "${prompt}"`,
    `${plan.people} people, ${plan.foodType} style, Pak n Save if you can.`,
    budgetLine,
    `Best-value pick: ${bestShop}.`,
    assumptionsLine,
    topMeals ? `Meals for the week: ${topMeals}.` : '',
    topItems ? `Pick up: ${topItems}.` : '',
    modeLine,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = String(body?.message || '').trim();

    if (!prompt) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const parsedInput = {
      budget: inferBudget(prompt),
      people: inferPeople(prompt),
      foodType: inferFoodType(prompt),
      dietaryRestrictions: inferDietaryRestrictions(prompt),
      likedFoods: inferLikedFoods(prompt),
      likedShops: inferLikedShops(prompt),
      userLocation: inferLocation(prompt),
    };

    let databaseAvailable = true;
    try {
      await dbConnect();
      await ensureMvpSeedData();
    } catch (dbError) {
      databaseAvailable = false;
      console.warn('Database unavailable for feed chat. Using fallback mode.', dbError?.message || dbError);
    }

    const plan = databaseAvailable
      ? await generateMealPlan(parsedInput)
      : generateFallbackMealPlan(parsedInput);

    const reply = buildReply(prompt, plan, !databaseAvailable);

    return NextResponse.json({
      reply,
      plan,
      assumptions: parsedInput,
      fallbackMode: !databaseAvailable,
    });
  } catch (error) {
    console.error('Feed G chat error:', error);
    return NextResponse.json({ error: 'Failed to generate Feed G response' }, { status: 500 });
  }
}
