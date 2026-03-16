import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { ensureMvpSeedData } from '@/lib/bootstrapData';
import { generateMealPlan } from '@/lib/mealPlanner';
import { generateFallbackMealPlan } from '@/lib/fallbackMealPlanner';
import MealPlan from '@/lib/models/MealPlan';

function parseRestrictions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePreferences(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLocation(value) {
  return String(value || '').trim();
}

export async function POST(request) {
  try {
    const session = await auth();

    const {
      budget,
      people,
      foodType,
      dietaryRestrictions = [],
      likedFoods = [],
      likedShops = [],
      userLocation = '',
      save = true,
    } = await request.json();

    const parsedInput = {
      budget: Number(budget),
      people: Number(people),
      foodType,
      dietaryRestrictions: parseRestrictions(dietaryRestrictions),
      likedFoods: parsePreferences(likedFoods),
      likedShops: parsePreferences(likedShops),
      userLocation: parseLocation(userLocation),
    };

    if (!Number.isFinite(Number(budget)) || Number(budget) <= 0 || !Number.isFinite(Number(people)) || Number(people) <= 0) {
      return NextResponse.json({ error: 'budget and people must be positive numbers' }, { status: 400 });
    }

    let databaseAvailable = true;
    try {
      await dbConnect();
      await ensureMvpSeedData();
    } catch (dbError) {
      databaseAvailable = false;
      console.warn('Database unavailable. Using fallback meal planner mode.', dbError?.message || dbError);
    }

    const plan = databaseAvailable
      ? await generateMealPlan(parsedInput)
      : generateFallbackMealPlan(parsedInput);

    let savedPlan = null;
    if (databaseAvailable && save && session?.user?.id) {
      const mealPlan = await MealPlan.create({
        userId: session.user.id,
        budget: plan.budget,
        people: plan.people,
        foodType: plan.foodType,
        dietaryRestrictions: plan.dietaryRestrictions,
        likedFoods: plan.likedFoods,
        likedShops: plan.likedShops,
        userLocation: plan.userLocation,
        meals: plan.meals,
        shoppingList: plan.shoppingList,
        estimatedCosts: plan.estimatedCosts,
      });

      savedPlan = {
        id: mealPlan._id.toString(),
        createdAt: mealPlan.createdAt,
      };
    }

    return NextResponse.json({
      plan,
      savedPlan,
      fallbackMode: !databaseAvailable,
    });
  } catch (error) {
    console.error('Generate meal plan error:', error);
    return NextResponse.json({ error: 'Failed to generate meal plan' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 50);

    const [plans, total] = await Promise.all([
      MealPlan.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MealPlan.countDocuments({ userId: session.user.id }),
    ]);

    return NextResponse.json({
      plans: plans.map((plan) => ({
        id: plan._id.toString(),
        budget: plan.budget,
        people: plan.people,
        foodType: plan.foodType,
        meals: plan.meals,
        estimatedCosts: plan.estimatedCosts,
        createdAt: plan.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get meal plans error:', error);
    return NextResponse.json({ error: 'Failed to fetch meal plans' }, { status: 500 });
  }
}
