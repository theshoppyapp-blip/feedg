'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [notice, setNotice] = useState('');
  const [priceForm, setPriceForm] = useState({ storeId: '', productId: '', price: '' });
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    servings: 2,
    instructions: '',
    tags: 'healthy,cheap',
    ingredients: [{ productId: '', quantity: 1, unit: 'unit' }],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    async function loadData() {
      setLoadingSummary(true);
      const [summaryRes, storesRes, productsRes] = await Promise.all([
        fetch('/api/dashboard/summary', { cache: 'no-store' }),
        fetch('/api/stores', { cache: 'no-store' }),
        fetch('/api/products?limit=100', { cache: 'no-store' }),
      ]);

      const [summaryData, storesData, productsData] = await Promise.all([
        summaryRes.json(),
        storesRes.json(),
        productsRes.json(),
      ]);

      if (summaryRes.ok) {
        setSummary(summaryData);
      }
      if (storesRes.ok) {
        setStores(storesData.stores || []);
      }
      if (productsRes.ok) {
        setProducts(productsData.products || []);
      }

      setLoadingSummary(false);
    }

    loadData();
  }, [status]);

  async function submitPrice(event) {
    event.preventDefault();
    setNotice('');

    const response = await fetch('/api/submit-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: priceForm.storeId,
        productId: priceForm.productId,
        price: Number(priceForm.price),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setNotice(data.error || 'Price submission failed');
      return;
    }

    setNotice('Price submitted. Thanks for contributing!');
    setPriceForm((prev) => ({ ...prev, price: '' }));
  }

  async function submitRecipe(event) {
    event.preventDefault();
    setNotice('');

    const response = await fetch('/api/submit-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: recipeForm.name,
        servings: Number(recipeForm.servings),
        instructions: recipeForm.instructions
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        tags: recipeForm.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        ingredients: recipeForm.ingredients.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setNotice(data.error || 'Recipe submission failed');
      return;
    }

    setNotice('Recipe submitted for moderation.');
    setRecipeForm({
      name: '',
      servings: 2,
      instructions: '',
      tags: 'healthy,cheap',
      ingredients: [{ productId: '', quantity: 1, unit: 'unit' }],
    });
  }

  function updateIngredient(index, key, value) {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addIngredientRow() {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { productId: '', quantity: 1, unit: 'unit' }],
    }));
  }

  if (status === 'loading') {
    return <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6">Loading…</main>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold">Hello, {session.user.name || session.user.email}</h1>
          <p className="mt-2 text-slate-300">Track your meal plans and contribute data to make Shoppy smarter.</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Contribution Score</h2>
          <p className="mt-2 text-4xl font-semibold text-emerald-200">
            {loadingSummary ? '...' : (summary?.contributionScore || 0)}
          </p>
          <p className="mt-2 text-sm text-slate-300">Earn points by submitting prices and healthy recipes.</p>
          <Link href="/" className="mt-5 inline-block text-cyan-300 hover:underline">Generate another meal plan</Link>
        </section>

        <section className="card rounded-3xl p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Saved Meal Plans</h2>
          {!summary?.savedMealPlans?.length ? (
            <p className="mt-3 text-sm text-slate-300">No saved plans yet. Generate one from the home page.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {summary.savedMealPlans.map((plan) => (
                <li key={plan.id} className="rounded-xl border border-white/10 p-3">
                  <p className="font-medium text-slate-100">{plan.foodType} · ${plan.budget} · {plan.people} people</p>
                  <p className="mt-1 text-slate-300">Meals: {plan.meals.slice(0, 3).join(', ')}{plan.meals.length > 3 ? '…' : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Submit a grocery price</h2>
          <form onSubmit={submitPrice} className="mt-4 space-y-3">
            <select value={priceForm.storeId} onChange={(event) => setPriceForm((prev) => ({ ...prev, storeId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5" required>
              <option value="">Select store</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
            <select value={priceForm.productId} onChange={(event) => setPriceForm((prev) => ({ ...prev, productId: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5" required>
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input type="number" min="0.01" step="0.01" value={priceForm.price} onChange={(event) => setPriceForm((prev) => ({ ...prev, price: event.target.value }))} placeholder="Price" className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5" required />
            <button type="submit" className="w-full rounded-lg bg-violet-500 px-4 py-2.5 font-medium text-white hover:bg-violet-400">Submit Price</button>
          </form>
        </section>

        <section className="card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Submit a healthy recipe</h2>
          <form onSubmit={submitRecipe} className="mt-4 space-y-3">
            <input type="text" value={recipeForm.name} onChange={(event) => setRecipeForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Recipe name" className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5" required />
            <input type="number" min="1" value={recipeForm.servings} onChange={(event) => setRecipeForm((prev) => ({ ...prev, servings: event.target.value }))} placeholder="Servings" className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5" required />

            {recipeForm.ingredients.map((item, index) => (
              <div key={`ingredient-${index}`} className="grid grid-cols-3 gap-2">
                <select value={item.productId} onChange={(event) => updateIngredient(index, 'productId', event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2" required>
                  <option value="">Product</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateIngredient(index, 'quantity', event.target.value)} placeholder="Qty" className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2" required />
                <input type="text" value={item.unit} onChange={(event) => updateIngredient(index, 'unit', event.target.value)} placeholder="Unit" className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-2" required />
              </div>
            ))}

            <button type="button" onClick={addIngredientRow} className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm hover:bg-white/5">Add ingredient</button>
            <textarea value={recipeForm.instructions} onChange={(event) => setRecipeForm((prev) => ({ ...prev, instructions: event.target.value }))} rows={3} placeholder="Instructions, one step per line" className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5" />
            <input type="text" value={recipeForm.tags} onChange={(event) => setRecipeForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags e.g. healthy,cheap,high protein" className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5" />
            <button type="submit" className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 font-medium text-white hover:bg-cyan-500">Submit Recipe</button>
          </form>
        </section>
      </div>

      {notice ? <p className="mt-4 text-sm text-amber-200">{notice}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Your submitted prices</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {(summary?.submittedPrices || []).map((item) => (
              <li key={item.id}>• {item.storeName} - {item.productName}: ${item.price}</li>
            ))}
          </ul>
        </section>

        <section className="card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Your submitted recipes</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {(summary?.submittedRecipes || []).map((item) => (
              <li key={item.id}>• {item.name} ({item.status})</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
