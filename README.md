This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Typhoon AI integration

The Express services support Gemini (default) or Typhoon for Thai command
interpretation and behavior prediction. Select the provider in the root `.env`:

To use Gemini first and automatically use Typhoon on HTTP 429 (quota/rate limit)
or 503 (temporary overload), configure both keys:

```dotenv
AI_PROVIDER=gemini
AI_FALLBACK_PROVIDER=typhoon
GEMINI_API_KEY=your-gemini-key
TYPHOON_API_KEY=your-typhoon-key
```

The backup receives the same prompt immediately, without waiting through Gemini
retries. Each new request tries Gemini first. Cost entries identify the actual
provider and `fallback_from`. Authentication and malformed-request errors do not
silently switch providers. If both services fail, the existing rule fallback is
used. To use Typhoon as the primary provider instead:

```dotenv
AI_PROVIDER=typhoon
TYPHOON_API_KEY=your-key-from-the-typhoon-playground
TYPHOON_MODEL=typhoon-v2.5-30b-a3b-instruct
```

Use the [Typhoon API documentation](https://docs.opentyphoon.ai/en/api-reference/)
to obtain a key. Keep keys in the server's root `.env`, never in mobile/public
environment variables. Restart both `node server/ai.cjs` (port 5000) and
`node server/server.cjs` (port 4000) after changing the provider. Set
`AI_PROVIDER=gemini` to switch back. Groq voice transcription is unchanged.

`server/ai_provider.cjs` handles the two API formats. Both services retain their
existing rule fallback when an AI request fails. Typhoon costs are recorded as
unknown unless `TYPHOON_PRICE_INPUT_PER_M` and `TYPHOON_PRICE_OUTPUT_PER_M` are
set; `/ai-cost` reports `unpriced_calls` and totals only known costs across the
historical log. It does not apply Gemini prices to Typhoon calls.

Run the mocked provider tests without API credentials or device actions:

```bash
node --test server/ai_provider.test.cjs
```

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
"# synapse" 
