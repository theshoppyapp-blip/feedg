import Store from '@/lib/models/Store';
import Product from '@/lib/models/Product';
import Price from '@/lib/models/Price';
import Recipe from '@/lib/models/Recipe';

const baseStores = [
  { name: 'Paknsave', location: 'Auckland', type: 'supermarket' },
  { name: 'New World', location: 'Auckland', type: 'supermarket' },
  { name: 'Local Market', location: 'Central', type: 'local market' },
];

const baseProducts = [
  { name: 'Oats', category: 'grains', unit: 'kg' },
  { name: 'Banana', category: 'fruit', unit: 'kg' },
  { name: 'Chicken Breast', category: 'protein', unit: 'kg' },
  { name: 'Chicken Drumsticks', category: 'protein', unit: 'kg' },
  { name: 'Mixed Vegetables', category: 'vegetable', unit: 'kg' },
  { name: 'Broccoli', category: 'vegetable', unit: 'head' },
  { name: 'Onion', category: 'vegetable', unit: 'kg' },
  { name: 'Rice', category: 'grains', unit: 'kg' },
  { name: 'Pasta', category: 'grains', unit: 'kg' },
  { name: 'Tofu', category: 'protein', unit: 'kg' },
  { name: 'Lentils', category: 'legumes', unit: 'kg' },
  { name: 'Eggs', category: 'protein', unit: 'dozen' },
  { name: 'Spinach', category: 'vegetable', unit: 'bag' },
  { name: 'Tomato', category: 'vegetable', unit: 'kg' },
  { name: 'Tinned Tomatoes', category: 'canned', unit: 'tin' },
  { name: 'Cream', category: 'dairy', unit: 'bottle' },
  { name: 'Oil', category: 'pantry', unit: 'bottle' },
];

const priceTable = {
  Paknsave: {
    Oats: 4.2,
    Banana: 2.8,
    'Chicken Breast': 12.5,
    'Chicken Drumsticks': 5.35,
    'Mixed Vegetables': 5.9,
    Broccoli: 2.5,
    Onion: 1.2,
    Rice: 3.5,
    Pasta: 1.0,
    Tofu: 6.5,
    Lentils: 4.1,
    Eggs: 6.9,
    Spinach: 3.4,
    Tomato: 4.6,
    'Tinned Tomatoes': 0.99,
    Cream: 3.8,
    Oil: 4.5,
  },
  'New World': {
    Oats: 5.1,
    Banana: 3.4,
    'Chicken Breast': 14.2,
    'Chicken Drumsticks': 6.8,
    'Mixed Vegetables': 6.9,
    Broccoli: 3.2,
    Onion: 1.5,
    Rice: 4.4,
    Pasta: 1.5,
    Tofu: 7.3,
    Lentils: 4.9,
    Eggs: 7.8,
    Spinach: 3.9,
    Tomato: 5.4,
    'Tinned Tomatoes': 1.29,
    Cream: 4.2,
    Oil: 5.2,
  },
  'Local Market': {
    Oats: 4.6,
    Banana: 2.3,
    'Chicken Breast': 11.8,
    'Chicken Drumsticks': 5.0,
    'Mixed Vegetables': 5.1,
    Broccoli: 2.2,
    Onion: 0.95,
    Rice: 4.1,
    Pasta: 0.95,
    Tofu: 6.9,
    Lentils: 4.0,
    Eggs: 6.5,
    Spinach: 3.2,
    Tomato: 3.9,
    'Tinned Tomatoes': 0.85,
    Cream: 3.5,
    Oil: 4.2,
  },
};

const baseRecipes = [
  {
    name: 'Oats + Banana Breakfast',
    servings: 2,
    instructions: ['Cook oats with water', 'Slice banana on top'],
    tags: ['healthy', 'cheap', 'student budget', 'vegetarian'],
    ingredients: [
      { productName: 'Oats', quantity: 0.25, unit: 'kg' },
      { productName: 'Banana', quantity: 0.4, unit: 'kg' },
    ],
  },
  {
    name: 'Chicken Stir Fry',
    servings: 3,
    instructions: ['Cook rice', 'Stir fry chicken and vegetables'],
    tags: ['healthy', 'high protein'],
    ingredients: [
      { productName: 'Chicken Breast', quantity: 0.5, unit: 'kg' },
      { productName: 'Mixed Vegetables', quantity: 0.5, unit: 'kg' },
      { productName: 'Rice', quantity: 0.4, unit: 'kg' },
    ],
  },
  {
    name: 'Lentil Vegetable Soup',
    servings: 4,
    instructions: ['Simmer lentils and vegetables', 'Season and serve'],
    tags: ['healthy', 'cheap', 'vegetarian', 'student budget'],
    ingredients: [
      { productName: 'Lentils', quantity: 0.45, unit: 'kg' },
      { productName: 'Tomato', quantity: 0.5, unit: 'kg' },
      { productName: 'Spinach', quantity: 1, unit: 'bag' },
    ],
  },
  {
    name: 'Tofu Rice Bowl',
    servings: 3,
    instructions: ['Pan-fry tofu', 'Serve with rice and spinach'],
    tags: ['healthy', 'vegetarian', 'high protein'],
    ingredients: [
      { productName: 'Tofu', quantity: 0.45, unit: 'kg' },
      { productName: 'Rice', quantity: 0.45, unit: 'kg' },
      { productName: 'Spinach', quantity: 1, unit: 'bag' },
    ],
  },
  {
    name: 'Egg Fried Rice',
    servings: 3,
    instructions: ['Cook rice', 'Scramble eggs and mix with vegetables'],
    tags: ['cheap', 'student budget', 'vegetarian'],
    ingredients: [
      { productName: 'Rice', quantity: 0.5, unit: 'kg' },
      { productName: 'Eggs', quantity: 0.5, unit: 'dozen' },
      { productName: 'Mixed Vegetables', quantity: 0.4, unit: 'kg' },
    ],
  },
  {
    name: 'Budget Pasta with Chicken and Broccoli',
    servings: 6,
    instructions: [
      'Oil and season drumsticks, roast at 200°C for 25 mins',
      'Boil pasta in salted water',
      'Sauté onion, add tinned tomatoes and cream, simmer 10 mins',
      'Boil broccoli until tender',
      'Serve pasta with sauce, top with roasted drumsticks and broccoli on the side',
    ],
    tags: ['cheap', 'student budget', 'high protein'],
    ingredients: [
      { productName: 'Chicken Drumsticks', quantity: 0.6, unit: 'kg' },
      { productName: 'Pasta', quantity: 0.4, unit: 'kg' },
      { productName: 'Tinned Tomatoes', quantity: 1, unit: 'tin' },
      { productName: 'Broccoli', quantity: 0.5, unit: 'head' },
      { productName: 'Onion', quantity: 0.15, unit: 'kg' },
      { productName: 'Cream', quantity: 0.2, unit: 'bottle' },
      { productName: 'Oil', quantity: 0.05, unit: 'bottle' },
    ],
  },
];

export async function ensureMvpSeedData() {
  const [storeCount, productCount, recipeCount] = await Promise.all([
    Store.countDocuments(),
    Product.countDocuments(),
    Recipe.countDocuments(),
  ]);

  if (storeCount === 0) {
    await Store.insertMany(baseStores);
  }

  if (productCount === 0) {
    await Product.insertMany(baseProducts);
  }

  const [stores, products] = await Promise.all([
    Store.find().lean(),
    Product.find().lean(),
  ]);

  const storeByName = new Map(stores.map((store) => [store.name, store]));
  const productByName = new Map(products.map((product) => [product.name, product]));

  const priceCount = await Price.countDocuments();
  if (priceCount === 0) {
    const seedPrices = [];
    for (const [storeName, entries] of Object.entries(priceTable)) {
      const store = storeByName.get(storeName);
      if (!store) continue;
      for (const [productName, value] of Object.entries(entries)) {
        const product = productByName.get(productName);
        if (!product) continue;
        seedPrices.push({
          storeId: store._id,
          productId: product._id,
          price: value,
          source: 'scraped',
          updatedAt: new Date(),
        });
      }
    }

    if (seedPrices.length > 0) {
      await Price.insertMany(seedPrices);
    }
  }

  if (recipeCount === 0) {
    const recipeDocs = baseRecipes
      .map((recipe) => {
        const mappedIngredients = recipe.ingredients
          .map((ingredient) => {
            const product = productByName.get(ingredient.productName);
            if (!product) return null;
            return {
              productId: product._id,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
            };
          })
          .filter(Boolean);

        return {
          name: recipe.name,
          servings: recipe.servings,
          instructions: recipe.instructions,
          tags: recipe.tags,
          ingredients: mappedIngredients,
          source: 'seed',
          status: 'approved',
        };
      })
      .filter((recipe) => recipe.ingredients.length > 0);

    if (recipeDocs.length > 0) {
      await Recipe.insertMany(recipeDocs);
    }
  }
}
