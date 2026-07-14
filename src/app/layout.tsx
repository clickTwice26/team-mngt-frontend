import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { DateLocalizationProvider } from "@/components/date-localization-provider";
import { AuthProvider } from "@/context/auth-context";
import theme, { googleSans } from "@/theme";

const PRODUCT_NAME = "TeamUp";
const TAGLINE = "Run your teams, not your spreadsheets";
const DESCRIPTION =
  "TeamUp keeps teams, tasks, meetings, work logs and performance in one place. " +
  "Assign work, discuss it where it lives, log the hours behind it, and see how the " +
  "work is actually going — without chasing status updates.";

export const metadata: Metadata = {
  // A page that sets its own title gets "<title> · TeamUp"; everything else falls
  // back to the tagline, so a bare link still says what the product is.
  title: {
    default: `${PRODUCT_NAME} — ${TAGLINE}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: PRODUCT_NAME,
  keywords: [
    "team management",
    "task management",
    "team collaboration",
    "work log",
    "time tracking",
    "meeting notes",
    "team performance",
  ],
  openGraph: {
    type: "website",
    siteName: PRODUCT_NAME,
    title: `${PRODUCT_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRODUCT_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={googleSans.className}>
      <body>
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <ThemeProvider theme={theme}>
            {/* CssBaseline applies Material Design's baseline + resets. */}
            <CssBaseline />
            {/* App-wide date adapter, so any date/time picker just works —
                no per-usage setup. */}
            <DateLocalizationProvider>
              <AuthProvider>{children}</AuthProvider>
            </DateLocalizationProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
