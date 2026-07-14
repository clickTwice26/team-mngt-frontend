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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy (Vercel)

The app is a standard Next.js App Router project — no adapter needed. Two things
have to line up, and both are easy to get wrong:

### 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production,
Preview and Development). Every one is `NEXT_PUBLIC_*`, so it is **baked into the
client bundle at build time** — change one and you must redeploy for it to take
effect.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | your deployed backend, e.g. `https://api.example.com` — **no trailing slash** |
| `NEXT_PUBLIC_API_VERSION` | `v1` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | must match the backend's `FIREBASE_PROJECT_ID` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | from Firebase Console |

None of these are secrets — they're public client identifiers. The API is what
enforces access, not the browser.

### 2. The backend has to allow this origin

The browser calls the API directly, so **CORS on the backend must list the Vercel
domain**. On CapRover set:

```
BACKEND_CORS_ORIGINS=https://your-app.vercel.app
```

(comma-separated for several — include any custom domain too). If you skip this,
the app loads fine and then every request fails in the browser with a CORS error
that looks like the backend is down. It isn't.

Also add the Vercel domain to **Firebase Console → Authentication → Settings →
Authorized domains**, or Google sign-in will be rejected.

### 3. Deploy

```bash
cd frontend
vercel          # preview
vercel --prod   # production
```

Or connect the repo in the Vercel dashboard and set **Root Directory** to
`frontend`.

### Notes

- `output: "standalone"` is switched off automatically on Vercel (it's only for
  the Docker image) — see `next.config.ts`.
- Attachments are served from Cloudflare R2 via plain `<img>`/`<video>` tags, not
  `next/image`, so no `remotePatterns` config is required.
