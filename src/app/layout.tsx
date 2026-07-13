import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { AuthProvider } from "@/context/auth-context";
import theme, { googleSans } from "@/theme";

export const metadata: Metadata = {
  title: "Team Management",
  description: "FastAPI + MongoDB + Next.js — Material UI frontend",
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
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
