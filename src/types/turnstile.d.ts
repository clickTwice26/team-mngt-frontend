/** Minimal typings for the Cloudflare Turnstile browser API (window.turnstile).
 *
 * Only the render/reset/remove surface this app uses is declared. Full docs:
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "flexible" | "compact";
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

interface Window {
  turnstile?: TurnstileApi;
}
