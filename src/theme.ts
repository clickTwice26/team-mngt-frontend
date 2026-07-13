"use client";

import { createTheme } from "@mui/material/styles";
import { indigo, pink } from "@mui/material/colors";
import { Google_Sans } from "next/font/google";

/**
 * The classic Material Design ("old Google") theme:
 *   - Indigo primary + Pink secondary (the original Material palette)
 *   - Google Sans typeface
 *
 * This is the single source of truth for styling. Every component pulls its
 * colors, spacing and typography from here — no bespoke CSS anywhere.
 */

// Variable font: omitting `weight` pulls the full wght 400..700 range in one
// file. `opsz` is an optical-size axis the browser drives off the rendered
// size; it isn't served unless requested explicitly.
export const googleSans = Google_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  // Next has no built-in metrics for Google Sans, so it can't synthesise a
  // size-adjusted fallback. Roboto is the closest-metric face and is already
  // on most devices, which keeps the pre-swap layout shift small.
  fallback: ["Roboto", "Helvetica", "Arial", "sans-serif"],
});

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: {
      main: indigo[500], // #3f51b5 — classic Material indigo
      dark: indigo[700],
      light: indigo[300],
    },
    secondary: {
      main: pink.A400, // #f50057 — classic Material pink accent
    },
    background: {
      default: "#fafafa",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: googleSans.style.fontFamily,
    // Google Sans bottoms out at wght 400, so MUI's default light weight (300)
    // would be synthesised by the browser. Clamp it to the real lower bound.
    fontWeightLight: 400,
    button: {
      textTransform: "uppercase",
      fontWeight: 500,
      letterSpacing: 0.5,
    },
  },
  shape: {
    borderRadius: 4, // squared-off Material look
  },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 4 },
    },
    MuiButton: {
      defaultProps: { disableElevation: false },
    },
  },
});

export default theme;
