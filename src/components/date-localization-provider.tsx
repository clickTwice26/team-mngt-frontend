"use client";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

/**
 * Wraps MUI X's `LocalizationProvider` with the dayjs adapter already applied.
 *
 * `AdapterDayjs` is a class, and a Server Component (the root layout) can't
 * pass a function/class prop across the RSC boundary into a Client Component
 * — Next rejects it at build time. Setting `dateAdapter` here, entirely
 * inside client code, avoids that boundary crossing.
 */
export function DateLocalizationProvider({ children }: { children: React.ReactNode }) {
  return <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>;
}
