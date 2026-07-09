/**
 * Centralized, validated access to public environment variables.
 *
 * Only `NEXT_PUBLIC_*` variables are available in the browser. Keep this the
 * single place the app reads configuration so misconfigurations fail loudly.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  /** Base URL of the FastAPI backend, e.g. http://localhost:8000 */
  apiUrl: required(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
    "NEXT_PUBLIC_API_URL",
  ),
  apiVersion: process.env.NEXT_PUBLIC_API_VERSION ?? "v1",
  /**
   * Firebase Web SDK config (Firebase Console > Project Settings > General >
   * Your apps). These are public client identifiers, not secrets — safe to
   * ship in the browser bundle. An empty apiKey disables "Continue with
   * Google".
   */
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  },
} as const;

export const apiBaseUrl = `${env.apiUrl}/api/${env.apiVersion}`;
