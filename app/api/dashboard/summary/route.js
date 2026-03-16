import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import MealPlan from '@/lib/models/MealPlan';
import Recipe from '@/lib/models/Recipe';
import UserSubmittedPrice from '@/lib/models/UserSubmittedPrice';
import UserSubmittedRecipe from '@/lib/models/UserSubmittedRecipe';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const [mealPlans, submittedPrices, submittedRecipeLinks] = await Promise.all([
      MealPlan.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(8).lean(),
      UserSubmittedPrice.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(8).populate('storeId productId').lean(),
      UserSubmittedRecipe.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(8).populate('recipeId').lean(),
    ]);

    const recipeIds = submittedRecipeLinks.map((item) => item.recipeId?._id).filter(Boolean);
    const moderationCounts = await Recipe.aggregate([
      { $match: { _id: { $in: recipeIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const moderationMap = new Map(moderationCounts.map((row) => [row._id, row.count]));

    const contributionScore = (submittedPrices.length * 2)
      + (submittedRecipeLinks.length * 5)
      + (Number(moderationMap.get('approved') || 0) * 3);

    return NextResponse.json({
      savedMealPlans: mealPlans.map((plan) => ({
        id: plan._id.toString(),
        createdAt: plan.createdAt,
        budget: plan.budget,
        people: plan.people,
        foodType: plan.foodType,
        meals: plan.meals,
        estimatedCosts: plan.estimatedCosts,
      })),
      submittedPrices: submittedPrices.map((item) => ({
        id: item._id.toString(),
        storeName: item.storeId?.name || 'Unknown Store',
        productName: item.productId?.name || 'Unknown Product',
        price: item.price,
        createdAt: item.createdAt,
      })),
      submittedRecipes: submittedRecipeLinks.map((item) => ({
        id: item._id.toString(),
        recipeId: item.recipeId?._id?.toString(),
        name: item.recipeId?.name || 'Deleted Recipe',
        status: item.recipeId?.status || 'unknown',
        createdAt: item.createdAt,
      })),
      contributionScore,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
