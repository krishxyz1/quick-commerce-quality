# Spoilt: a quality radar for quick-commerce grocery

10,321 Play Store reviews of Blinkit, Zepto, Instamart, BigBasket (BB Now) and Flipkart Minutes, labelled by an LLM for what actually went wrong. The categories are stale or spoiled food, damage, missing and wrong items, late orders, refunds, pricing, app bugs and delivery partners. The labelled reviews feed a dashboard that compares the apps and shows which foods break trust.

## What it found

- **Zepto reviews report stale or spoiled food 13.4% of the time**, 3× Blinkit's 4.4%. Instamart (6.8%) and BigBasket (7.7%) sit between them.
- **Fruit, vegetables and dairy are 62% of freshness complaints** that name a food. On BigBasket, fruit and veg alone produce 25 complaints per 1,000 reviews.
- **Trust breaks on what arrives, not on price.** Reviews about refunds, wrong, damaged or missing items say the customer is leaving 26–28% of the time. For pricing complaints it's 14%, and for app bugs 13%.
- **BigBasket's freshness share rose** from 7.0% to 8.8% of reviews over five weeks, while Instamart's fell from 8.1% to 5.5%.

## How it works

```
pipeline/scrape.mjs     newest English reviews per app (google-play-scraper), names dropped
pipeline/classify.mjs   Gemini, 40 reviews per call, structured JSON output, resumable on rate limits
pipeline/validate.mjs   300-review sample re-labelled by a larger model, Cohen's kappa per issue
pipeline/aggregate.mjs  rates, food-by-app matrix, weekly trend, quotes -> data/summary.json
lib/taxonomy.ts         the one prompt + schema, shared by the pipeline and the live API route
app/                    Next.js dashboard: overview, review log, live labeller, method
```

The taxonomy and prompt live in one file, so the reviews labelled offline and the review you paste into **Label a review** get exactly the same treatment.

## Run it

```bash
npm install
cp .env.example .env.local          # add a Google AI Studio key (the free tier is enough)

node pipeline/scrape.mjs 2500       # about 2 minutes
node pipeline/classify.mjs          # about 20 minutes on the free tier; safe to stop and restart
node pipeline/validate.mjs
node pipeline/aggregate.mjs

npm run dev                         # localhost:3000
```

The labelled data is committed, so `npm run dev` works without running the pipeline.

## Deploy

Import the repo into Vercel and set `GEMINI_API_KEY` in the project's environment variables. Everything except the live labeller works without it. The labeller is rate-limited per visitor so a free-tier key holds up.

## Limits

- Reviewers are not a random sample of customers. People write when something goes wrong, so every rate here overstates the true share of bad orders. The comparison between apps is the useful part.
- "Newest 2,500 reviews" covers 6 days for Blinkit and 37 for BigBasket. Rates are shares of each app's own reviews, never raw counts.
- Labels are model output, checked against a second model rather than by hand. The method page reports agreement per issue.
