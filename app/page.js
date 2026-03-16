'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [form, setForm] = useState({
    budget: 70,
    people: 2,
    foodType: 'healthy',
    dietaryRestrictions: '',
    likedFoods: '',
    likedShops: '',
    userLocation: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleGeneratePlan(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: Number(form.budget),
          people: Number(form.people),
          foodType: form.foodType,
          dietaryRestrictions: form.dietaryRestrictions,
          likedFoods: form.likedFoods,
          likedShops: form.likedShops,
          userLocation: form.userLocation,
          save: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to generate plan');
        setLoading(false);
        return;
      }

      setResult(data.plan);
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <section className="card rounded-3xl p-6 sm:p-8 md:p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Shoppy</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-5xl">Eat healthy within your budget</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Build a weekly meal plan, generate a shopping list, and compare grocery cost estimates by store.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/auth/signup" className="rounded-lg bg-violet-500 px-4 py-2.5 font-medium text-white hover:bg-violet-400">Create account</Link>
          <Link href="/auth/signin" className="rounded-lg border border-white/15 px-4 py-2.5 font-medium hover:bg-white/5">Sign in</Link>
          <Link href="/dashboard" className="rounded-lg border border-cyan-400/30 px-4 py-2.5 font-medium text-cyan-200 hover:bg-cyan-400/10">Dashboard</Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={handleGeneratePlan} className="card rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Step 1: Your weekly inputs</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">
              Weekly budget (NZD)
              <input
                type="number"
                min="1"
                value={form.budget}
                onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none"
                required
              />
            </label>

            <label className="text-sm text-slate-300">
              Number of people
              <input
                type="number"
                min="1"
                value={form.people}
                onChange={(event) => setForm((prev) => ({ ...prev, people: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none"
                required
              />
            </label>
          </div>

          <label className="mt-4 block text-sm text-slate-300">
            Food type
            <select
              value={form.foodType}
              onChange={(event) => setForm((prev) => ({ ...prev, foodType: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none"
            >
              <option value="healthy">Healthy</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="high protein">High protein</option>
              <option value="student budget">Student budget</option>
            </select>
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Dietary restrictions (optional, comma-separated)
            <input
              type="text"
              placeholder="e.g. vegetarian"
              value={form.dietaryRestrictions}
              onChange={(event) => setForm((prev) => ({ ...prev, dietaryRestrictions: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">
              Foods you like
              <input
                type="text"
                placeholder="e.g. banana, rice, tofu"
                value={form.likedFoods}
                onChange={(event) => setForm((prev) => ({ ...prev, likedFoods: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none"
              />
            </label>

            <label className="text-sm text-slate-300">
              Shops you like
              <input
                type="text"
                placeholder="e.g. Paknsave, Local Market"
                value={form.likedShops}
                onChange={(event) => setForm((prev) => ({ ...prev, likedShops: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none"
              />
            </label>

            <label className="text-sm text-slate-300">
              Your location
              <input
                type="text"
                placeholder="e.g. Auckland"
                value={form.userLocation}
                onChange={(event) => setForm((prev) => ({ ...prev, userLocation: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5 text-white outline-none"
              />
            </label>
          </div>

          <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-violet-500 px-4 py-3 font-medium text-white hover:bg-violet-400 disabled:opacity-60">
            {loading ? 'Generating…' : 'Step 2: Generate Meal Plan'}
          </button>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </form>

        <div className="card rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Step 3: Your plan</h2>
          {!result ? (
            <p className="mt-4 text-sm text-slate-300">
              Generate a plan to see meals, shopping list, and estimated prices by store.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              <section>
                <h3 className="font-medium text-cyan-200">Weekly Meal Plan</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-200">
                  {result.meals.map((meal, index) => (
                    <li key={`${meal}-${index}`}>• {meal}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-cyan-200">Shopping List</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-200">
                  {result.shoppingList.map((item) => (
                    <li key={`${item.productId}-${item.unit}`}>• {item.productName}: {item.quantity} {item.unit}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-cyan-200">Estimated Cost</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-200">
                  {result.estimatedCosts.map((store) => (
                    <li key={store.storeId}>• {store.storeName}: ${store.total}</li>
                  ))}
                </ul>
                {result.recommendation ? (
                  <p className="mt-3 text-sm text-emerald-200">
                    Best value: {result.recommendation.storeName} (${result.recommendation.total})
                  </p>
                ) : null}
                {result.likedShops?.length ? (
                  <p className="mt-2 text-sm text-slate-300">
                    Preferred shops: {result.likedShops.join(', ')}
                  </p>
                ) : null}
                {result.userLocation ? (
                  <p className="mt-1 text-sm text-slate-300">
                    Preferred location: {result.userLocation}
                  </p>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
