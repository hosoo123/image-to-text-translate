This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

## AI Providers

The API routes use the providers in `AI_PROVIDERS` order. If a provider is unavailable, rate-limited, or returns invalid JSON, the next configured provider is tried.

Add the needed variables from `.env.example` to `.env.local`; do not overwrite existing keys. The default chain is:

```env
AI_PROVIDERS=gemini,groq,openrouter
```

Set the corresponding server-side keys: `GEMINI_API_KEY`, `GROQ_API_KEY`, and `OPENROUTER_API_KEY`. The OpenRouter free-model quota and provider availability can change.

To add local Ollama as a fallback, install and pull a vision model such as `qwen3-vl:8b`, start Ollama, then use:

```env
AI_PROVIDERS=gemini,groq,openrouter,ollama
OLLAMA_BASE_URL=http://localhost:11434/v1/
OLLAMA_MODEL=qwen3-vl:8b
```

OpenAI is supported as an optional, normally paid provider by adding `openai` to `AI_PROVIDERS` and setting `OPENAI_API_KEY`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
