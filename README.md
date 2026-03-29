# Website Starter Template

A trimmed-down reusable project based on your current website's infrastructure.

## Included

- Next.js App Router project structure
- Auth.js credentials authentication
- MongoDB + Mongoose connection and models
- Stripe Checkout session + webhook flow
- Resend transactional email route
- Minimal UI for signup, signin, dashboard, and a demo payment flow

## Quick start

1. Copy this `starter-template` folder into a new repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Fill in the required environment variables.
5. Run `npm run dev`.

## Main files

- `auth.js` - Auth.js configuration
- `app/api/auth/signup/route.js` - signup endpoint
- `app/api/orders/route.js` - example domain endpoint
- `app/api/stripe/create-checkout-session/route.js` - Stripe Checkout starter
- `app/api/webhooks/stripe/route.js` - Stripe webhook starter
- `app/api/send-email/route.js` - Resend email starter
- `lib/mongodb.js` - Mongoose connection helper
- `lib/models/User.js` - user model
- `lib/models/Order.js` - generic payment/order model

## Replace first

When turning this into a new app, start by changing:

- app metadata in `app/layout.js`
- the home page content in `app/page.js`
- the `Order` model and related routes to match your app domain
- email HTML + subjects in `app/api/send-email/route.js`

## Environment setup guide

### MongoDB Atlas

1. Create a new project in MongoDB Atlas.
2. Create a cluster.
3. Add a database user.
4. Add your IP address or enable access for development.
5. Copy the connection string into `MONGODB_URI`.

### Auth.js secret

Generate a fresh secret:

```bash
openssl rand -base64 32
```

Set:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=http://localhost:3000` for local dev

### Stripe

1. Create a Stripe account or use an existing workspace.
2. Get your test API keys from the Stripe Dashboard.
3. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Run the Stripe CLI locally to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

5. Copy the webhook signing secret from the CLI output into `STRIPE_WEBHOOK_SECRET`.

### Resend

1. Create a Resend account.
2. Generate an API key.
3. For testing, you can use `onboarding@resend.dev` as the sender.
4. For production, verify your own domain and update `EMAIL_FROM`.

### Internal API key

Generate a private key for protected internal server-to-server email calls:

```bash
openssl rand -base64 32
```

Set it as `INTERNAL_API_KEY`.

## Notes

- This template intentionally does **not** include your current project secrets.
- It also avoids business-specific pages, content, booking logic, and admin workflows.
- The template uses a generic `Order` flow so you can adapt it to many app types.

## Price scraping setup

1. Copy [scraper.sources.example.json](scraper.sources.example.json) to `scraper.sources.json`.
2. Edit each source with real store page URL + CSS selectors:
	- `rowSelector`
	- `nameSelector`
	- `priceSelector`
	- optional `unitSelector`
3. Ensure `MONGODB_URI` is valid in `.env.local`.
4. Run dry mode first:

```bash
npm run scrape:prices:dry
```

5. If output looks correct, run real write:

```bash
npm run scrape:prices
```

## Automated Price Updates

You can run scraping on a schedule (for example every 12 hours) using the included cron endpoint.

1. Set a secret in your environment:

```bash
CRON_SECRET=your-random-secret
```

2. Keep `vercel.json` with the cron entry for:
 - path: `/api/cron/scrape-prices`
 - schedule: `0 */12 * * *`

3. Ensure `MONGODB_URI` is configured in production.
4. For hosted deployments, set `PAKNSAVE_STORAGE_STATE_JSON` with the JSON from your local `tmp/paknsave-storage.json`.

### Trigger manually

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scrape-prices
```

### Pak n Save caveat

Pak n Save uses anti-bot protections, so fully unattended scraping can fail when the saved browser session expires.
Use `npm run scrape:paknsave:session` periodically to refresh `tmp/paknsave-storage.json`, then update `PAKNSAVE_STORAGE_STATE_JSON`.

### Important

- Only scrape websites you are allowed to scrape (check each site's terms/robots policy).
- If HTML structure changes, update selectors in `scraper.sources.json`.
