import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Ingredient from '@/lib/models/Ingredient';
import Product from '@/lib/models/Product';
import Recipe from '@/lib/models/Recipe';
import UserSubmittedRecipe from '@/lib/models/UserSubmittedRecipe';

const allowedTags = new Set(['healthy', 'cheap', 'high protein', 'vegetarian', 'student budget']);

function normalizeTag(tag) {
  const value = String(tag || '').trim().toLowerCase();
  if (value === 'high-protein') return 'high protein';
  if (value === 'student' || value === 'student-budget') return 'student budget';
  return value;
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const {
      name,
      ingredients = [],
      servings,
      instructions = [],
      tags = ['healthy'],
    } = payload;

    if (!name || !Number.isFinite(Number(servings)) || Number(servings) <= 0 || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'name, servings and ingredients are required' }, { status: 400 });
    }

    await dbConnect();

    const ingredientDocs = [];

    for (const ingredient of ingredients) {
      const quantity = Number(ingredient.quantity);
      if (!ingredient.productId || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json({ error: 'Each ingredient needs productId and quantity > 0' }, { status: 400 });
      }

      const product = await Product.findById(ingredient.productId).lean();
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${ingredient.productId}` }, { status: 404 });
      }

      ingredientDocs.push({
        productId: product._id,
        quantity,
        unit: ingredient.unit || product.unit || 'unit',
      });
    }

    const normalizedTags = tags
      .map(normalizeTag)
      .filter((tag) => allowedTags.has(tag));

    const recipe = await Recipe.create({
      name,
      ingredients: ingredientDocs,
      servings: Number(servings),
      instructions: Array.isArray(instructions) ? instructions.filter(Boolean) : [],
      tags: normalizedTags.length > 0 ? normalizedTags : ['healthy'],
      source: 'user',
      status: 'pending',
    });

    await UserSubmittedRecipe.create({
      userId: session.user.id,
      recipeId: recipe._id,
    });

    await Ingredient.insertMany(ingredientDocs.map((ingredient) => ({
      recipeId: recipe._id,
      productId: ingredient.productId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    })));

    return NextResponse.json({
      message: 'Recipe submitted for review',
      recipe: {
        id: recipe._id.toString(),
        name: recipe.name,
        status: recipe.status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Submit recipe error:', error);
    return NextResponse.json({ error: 'Failed to submit recipe' }, { status: 500 });
  }
}
