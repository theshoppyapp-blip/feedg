function normalizeTag(input) {
  const value = (input || '').trim().toLowerCase();
  if (value === 'high-protein' || value === 'high protein') return 'high protein';
  if (value === 'student' || value === 'student-budget' || value === 'student budget') return 'student budget';
  if (value === 'veggie') return 'vegetarian';
  return value || 'healthy';
}

function normalizeList(values = []) {
  return values
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

const stores = [
  { id: 'paknsave', name: 'Paknsave', location: 'Auckland' },
  { id: 'newworld', name: 'New World', location: 'Auckland' },
  { id: 'localmarket', name: 'Local Market', location: 'Central' },
];

const prices = {
  Paknsave: { Oats: 4.2, Banana: 2.8, 'Chicken Breast': 12.5, 'Mixed Vegetables': 5.9, Rice: 3.5, Tofu: 6.5, Lentils: 4.1, Eggs: 6.9, Spinach: 3.4, Tomato: 4.6 },
  'New World': { Oats: 5.1, Banana: 3.4, 'Chicken Breast': 14.2, 'Mixed Vegetables': 6.9, Rice: 4.4, Tofu: 7.3, Lentils: 4.9, Eggs: 7.8, Spinach: 3.9, Tomato: 5.4 },
  'Local Market': { Oats: 4.6, Banana: 2.3, 'Chicken Breast': 11.8, 'Mixed Vegetables': 5.1, Rice: 4.1, Tofu: 6.9, Lentils: 4.0, Eggs: 6.5, Spinach: 3.2, Tomato: 3.9 },
};

const recipes = [
  {
    name: 'Oats + Banana Breakfast',
    servings: 2,
    tags: ['healthy', 'cheap', 'student budget', 'vegetarian'],
    ingredients: [{ productName: 'Oats', quantity: 0.25, unit: 'kg' }, { productName: 'Banana', quantity: 0.4, unit: 'kg' }],
  },
  {
    name: 'Chicken Stir Fry',
    servings: 3,
    tags: ['healthy', 'high protein'],
    ingredients: [{ productName: 'Chicken Breast', quantity: 0.5, unit: 'kg' }, { productName: 'Mixed Vegetables', quantity: 0.5, unit: 'kg' }, { productName: 'Rice', quantity: 0.4, unit: 'kg' }],
  },
  {
    name: 'Lentil Vegetable Soup',
    servings: 4,
    tags: ['healthy', 'cheap', 'vegetarian', 'student budget'],
    ingredients: [{ productName: 'Lentils', quantity: 0.45, unit: 'kg' }, { productName: 'Tomato', quantity: 0.5, unit: 'kg' }, { productName: 'Spinach', quantity: 1, unit: 'bag' }],
  },
  {
    name: 'Tofu Rice Bowl',
    servings: 3,
    tags: ['healthy', 'vegetarian', 'high protein'],
    ingredients: [{ productName: 'Tofu', quantity: 0.45, unit: 'kg' }, { productName: 'Rice', quantity: 0.45, unit: 'kg' }, { productName: 'Spinach', quantity: 1, unit: 'bag' }],
  },
  {
    name: 'Egg Fried Rice',
    servings: 3,
    tags: ['cheap', 'student budget', 'vegetarian'],
    ingredients: [{ productName: 'Rice', quantity: 0.5, unit: 'kg' }, { productName: 'Eggs', quantity: 0.5, unit: 'dozen' }, { productName: 'Mixed Vegetables', quantity: 0.4, unit: 'kg' }],
  },
];

function recipeScore(recipe, preferredFoods) {
  if (preferredFoods.length === 0) return 0;
  const haystack = [recipe.name, ...recipe.tags, ...recipe.ingredients.map((i) => i.productName)].join(' ').toLowerCase();
  return preferredFoods.reduce((score, item) => (haystack.includes(item) ? score + 1 : score), 0);
}

function storeScore(store, preferredShops, preferredLocation) {
  let score = 0;
  const name = store.name.toLowerCase();
  const location = (store.location || '').toLowerCase();
  if (preferredShops.some((shop) => name.includes(shop) || shop.includes(name))) score += 2;
  if (preferredLocation && location.includes(preferredLocation)) score += 1;
  return score;
}

export function generateFallbackMealPlan({ budget, people, foodType, dietaryRestrictions = [], likedFoods = [], likedShops = [], userLocation = '' }) {
  const normalizedFoodType = normalizeTag(foodType);
  const restrictions = normalizeList(dietaryRestrictions);
  const preferredFoods = normalizeList(likedFoods);
  const preferredShops = normalizeList(likedShops);
  const preferredLocation = String(userLocation || '').trim().toLowerCase();

  const filteredRecipes = recipes.filter((recipe) => {
    if (normalizedFoodType && !recipe.tags.includes(normalizedFoodType)) return false;
    if (restrictions.includes('vegetarian') && !recipe.tags.includes('vegetarian')) return false;
    return true;
  });

  const sourceRecipes = filteredRecipes.length ? filteredRecipes : recipes;
  const rankedRecipes = [...sourceRecipes].sort((a, b) => recipeScore(b, preferredFoods) - recipeScore(a, preferredFoods));

  const weeklyRecipes = [];
  for (let i = 0; i < 7; i += 1) {
    weeklyRecipes.push(rankedRecipes[i % rankedRecipes.length]);
  }

  const shoppingMap = new Map();
  for (const recipe of weeklyRecipes) {
    for (const ingredient of recipe.ingredients) {
      const key = `${ingredient.productName}:${ingredient.unit}`;
      const existing = shoppingMap.get(key) || { productId: ingredient.productName.toLowerCase().replace(/\s+/g, '-'), productName: ingredient.productName, quantity: 0, unit: ingredient.unit };
      existing.quantity += ingredient.quantity * Math.max(1, Number(people) / Number(recipe.servings || 1));
      shoppingMap.set(key, existing);
    }
  }

  const shoppingList = [...shoppingMap.values()]
    .map((item) => ({ ...item, quantity: roundCurrency(item.quantity) }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const estimatedCosts = stores
    .map((store) => {
      const total = shoppingList.reduce((sum, item) => sum + ((prices[store.name]?.[item.productName] || 0) * item.quantity), 0);
      return {
        storeId: store.id,
        storeName: store.name,
        storeLocation: store.location,
        total: roundCurrency(total),
      };
    })
    .sort((a, b) => a.total - b.total);

  const recommendation = [...estimatedCosts]
    .sort((a, b) => {
      const scoreDiff = storeScore({ name: b.storeName, location: b.storeLocation }, preferredShops, preferredLocation)
        - storeScore({ name: a.storeName, location: a.storeLocation }, preferredShops, preferredLocation);
      if (scoreDiff !== 0) return scoreDiff;
      return a.total - b.total;
    })[0] || null;

  return {
    budget: Number(budget),
    people: Number(people),
    foodType: normalizedFoodType,
    dietaryRestrictions: restrictions,
    likedFoods: preferredFoods,
    likedShops: preferredShops,
    userLocation: String(userLocation || '').trim(),
    meals: weeklyRecipes.map((recipe) => recipe.name),
    shoppingList,
    estimatedCosts,
    recommendation,
    budgetFit: recommendation ? recommendation.total <= Number(budget) : null,
    mode: 'fallback',
  };
}