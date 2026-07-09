"use client";

import { createTheme } from "@mui/material/styles";
import { indigo, pink } from "@mui/material/colors";
import { Roboto } from "next/font/google";

/**
 * The classic Material Design ("old Google") theme:
 *   - Indigo primary + Pink secondary (the original Material palette)
 *   - Roboto typeface
 *
 * This is the single source of truth for styling. Every component pulls its
 * colors, spacing and typography from here — no bespoke CSS anywhere.
 */

export const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
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
    fontFamily: roboto.style.fontFamily,
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
