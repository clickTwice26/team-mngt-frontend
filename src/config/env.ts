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
} as const;

export const apiBaseUrl = `${env.apiUrl}/api/${env.apiVersion}`;
