import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Recipe from '@/lib/models/Recipe';
import UserSubmittedRecipe from '@/lib/models/UserSubmittedRecipe';
import { requireAdmin } from '@/lib/serverAuth';

export async function GET(request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  await dbConnect();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const recipes = await Recipe.find({ source: 'user', status }).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({ recipes });
}

export async function PATCH(request) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { recipeId, status } = await request.json();

  if (!recipeId || !['approved', 'pending', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'recipeId and valid status are required' }, { status: 400 });
  }

  await dbConnect();
  const recipe = await Recipe.findByIdAndUpdate(recipeId, { status }, { new: true }).lean();
  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const submissions = await UserSubmittedRecipe.find({ recipeId }).populate('userId', 'email name').lean();

  return NextResponse.json({ recipe, submissions });
}
