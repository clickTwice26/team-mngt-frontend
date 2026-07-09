"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";

const COLLAPSE_STORAGE_KEY = "tm.sidebar.collapsed";

/**
 * Shared authenticated-app layout: fixed header + collapsible sidebar +
 * content area. The sidebar's collapsed/expanded preference is remembered
 * across visits (desktop only — mobile always uses the overlay drawer).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Deferred to a microtask (rather than read via a lazy useState initializer)
  // so the server-rendered and first client-rendered markup always agree —
  // avoiding a hydration mismatch — then the stored preference applies right
  // after mount.
  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "1");
    });
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppHeader
        onMenuClick={() => (isDesktop ? toggleCollapsed() : setMobileOpen(true))}
      />
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
