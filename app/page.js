'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function HomePage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Yo whanau, ask me your budget challenge. Example: "$20 for a family of 5 in Auckland?"',
      plan: null,
      assumptions: null,
    },
  ]);

  const quickPrompts = [
    '$20 for a family of 5?',
    '$35 high protein for 2 in Auckland',
    '$50 vegetarian for 4 in Christchurch',
  ];
  const leftPrompts = quickPrompts.filter((_, index) => index % 2 === 0);
  const rightPrompts = quickPrompts.filter((_, index) => index % 2 === 1);

  async function handleAsk(event, presetPrompt) {
    event.preventDefault();
    const message = (presetPrompt || input).trim();
    if (!message) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
      plan: null,
      assumptions: null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/feedg-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not build plan right now');
        return;
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        plan: data.plan,
        assumptions: data.assumptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="feed-page">
      <section className="hero-stack panel">
        <div className="hero-head">
          <p className="pill">NZ cheap kai chatbot</p>
          <h1 className="hero-title">Feed G?</h1>
          <p className="hero-subtitle">
            Ask your budget challenge and get a practical NZ-style plan with meals, trolley picks, and best-value supermarket guidance.
          </p>
        </div>

        <aside className="hero-art">
          <Image
            src="/feed-g.png"
            alt="Feed G branding"
            width={390}
            height={517}
            priority
            className="hero-image"
          />
        </aside>
      </section>

      <section className="chat-stage">
        <aside className="example-rail is-left" aria-label="Example prompts left">
          {leftPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="example-bubble"
              onClick={(event) => handleAsk(event, prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </aside>

        <div className="chat-shell panel">
          <div className="chat-log" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`bubble-wrap ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                <div className="bubble">
                  <p className="bubble-role">{message.role === 'user' ? 'You' : 'Feed G Bot'}</p>
                  <p className="bubble-text">{message.text}</p>
                  {message.plan ? (
                    <div className="plan-grid">
                      <div className="plan-card">
                        <h3>Best Shop</h3>
                        <p>
                          {message.plan.recommendation
                            ? `${message.plan.recommendation.storeName} ($${Number(message.plan.recommendation.total || 0).toFixed(2)})`
                            : 'No recommendation yet'}
                        </p>
                      </div>
                      <div className="plan-card">
                        <h3>Meals</h3>
                        <p>{(message.plan.meals || []).slice(0, 3).join(', ') || 'None yet'}</p>
                      </div>
                      <div className="plan-card">
                        <h3>Budget Fit</h3>
                        <p>{message.plan.budgetFit ? 'Within budget' : 'Over budget'}</p>
                      </div>
                    </div>
                  ) : null}

                  {message.assumptions ? (
                    <div className="assumptions-box">
                      <p className="assumptions-title">Assumptions</p>
                      <p className="assumptions-text">
                        Budget ${Number(message.assumptions.budget || 0).toFixed(2)}
                        {' · '}
                        {Number(message.assumptions.people || 0)} people
                        {' · '}
                        {message.assumptions.foodType || 'healthy'}
                      </p>
                      <p className="assumptions-text">
                        Restrictions: {(message.assumptions.dietaryRestrictions || []).join(', ') || 'none'}
                        {' · '}
                        Liked foods: {(message.assumptions.likedFoods || []).join(', ') || 'none'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
            {loading ? (
              <article className="bubble-wrap is-assistant">
                <div className="bubble loading-bubble">Cooking up a plan...</div>
              </article>
            ) : null}
          </div>

          <form className="chat-input-row" onSubmit={(event) => handleAsk(event)}>
            <label htmlFor="feedg-input" className="sr-only">Ask Feed G</label>
            <input
              id="feedg-input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Try: $20 for a family of 5 in Auckland"
              className="chat-input"
            />
            <button type="submit" className="send-btn" disabled={loading}>Send</button>
          </form>

          {error ? <p className="error-line">{error}</p> : null}
        </div>

        <aside className="example-rail is-right" aria-label="Example prompts right">
          {rightPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="example-bubble"
              onClick={(event) => handleAsk(event, prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </aside>
      </section>
    </main>
  );
}
