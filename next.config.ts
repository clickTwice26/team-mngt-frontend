import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` produces a self-contained server bundle for a Docker image.
  // Vercel builds its own output format and doesn't want it — leaving it on
  // there just makes Next emit a server bundle Vercel then ignores. `VERCEL` is
  // set automatically in their build environment.
  output: process.env.VERCEL ? undefined : "standalone",

  async headers() {
    return [
      {
        // Next.js's default Cross-Origin-Opener-Policy blocks the popup
        // window Firebase Auth's signInWithPopup opens from reporting its
        // result back to this window, which makes sign-in hang forever on
        // "Signing in…". `same-origin-allow-popups` keeps the isolation but
        // permits that one channel.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
