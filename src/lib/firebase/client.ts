"use client";

/**
 * Lazily-initialized Firebase app + Auth instance for client-side use.
 *
 * `auth` is `null` when no Firebase config is present, so callers (see
 * GoogleSignInButton) can render a disabled fallback instead of crashing.
 */

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

import { env } from "@/config/env";

export const firebaseConfigured = Boolean(
  env.firebase.apiKey && env.firebase.authDomain && env.firebase.projectId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (firebaseConfigured) {
  app = getApps()[0] ?? initializeApp(env.firebase);
  auth = getAuth(app);
}

export { auth };
