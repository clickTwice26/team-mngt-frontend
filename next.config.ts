import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal, self-contained server build for Docker images.
  output: "standalone",

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
