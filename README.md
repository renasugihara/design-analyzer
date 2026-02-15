# Design Analyzer

AI-powered tool that detects generic design patterns in websites and generates specific fix prompts for AI development tools (Cursor, v0, Lovable).

## Features

- **Free Tier**: Analyze any website URL and get 3 highest-impact issues
- **Paid Tier** ($19): Get all 5 issues + specific fix prompts + mega prompt
- **Pattern Detection**: Heavy shadows, default colors, layout issues, typography, accessibility
- **AI-Ready Prompts**: Copy-paste prompts that work with any AI dev tool

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Playwright (screenshots + HTML extraction)
- Claude API (Sonnet 4 for vision analysis)
- Stripe (payments)
- Vercel (deployment)

## Setup

1. Clone and install:
```bash
git clone https://github.com/renasugihara/design-analyzer.git
cd design-analyzer
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
# Add your API keys to .env.local
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `ANTHROPIC_API_KEY` - Claude API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_PRICE_ID` - Stripe price ID for $19 product
- `NEXT_PUBLIC_APP_URL` - App URL (http://localhost:3000 for dev)

## Testing

See `TESTING.md` for manual testing checklist.

Test URLs are in `test-urls.md`.

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to add all environment variables in Vercel dashboard.

## License

MIT
