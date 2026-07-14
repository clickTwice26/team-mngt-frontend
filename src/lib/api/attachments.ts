/** Fetching attachment content the app renders itself. */

import { apiClient } from "@/lib/api/client";

export interface MarkdownDocument {
  url: string;
  content: string;
}

export const attachmentsApi = {
  /**
   * The text of a Markdown attachment.
   *
   * Routed through our API rather than fetched from the bucket directly: the
   * bucket sends no CORS headers for our origin, and the server refuses any URL
   * that isn't one of its own objects.
   */
  getMarkdown: (token: string, url: string) =>
    apiClient.get<MarkdownDocument>(
      `/attachments/markdown?url=${encodeURIComponent(url)}`,
      { cache: "no-store", headers: { Authorization: `Bearer ${token}` } },
    ),
};
