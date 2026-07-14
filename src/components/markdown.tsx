"use client";

import type { ComponentPropsWithoutRef } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a Markdown string as sanitized, MUI-styled content.
 *
 * `react-markdown` does not render raw HTML embedded in the source (we do not
 * enable `rehype-raw`), so arbitrary user input is safe to display here.
 */

// Links always open in a new tab and drop the opener reference.
const components: Components = {
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

const baseSx: SxProps<Theme> = {
  fontSize: "0.875rem",
  lineHeight: 1.6,
  color: "text.secondary",
  wordBreak: "break-word",
  // Collapse outer margins so the block sits flush in its container.
  "& > :first-of-type": { mt: 0 },
  "& > :last-child": { mb: 0 },
  "& p": { my: 1 },
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    my: 1.5,
    fontWeight: 700,
    lineHeight: 1.3,
    color: "text.primary",
  },
  "& h1": { fontSize: "1.4rem" },
  "& h2": { fontSize: "1.25rem" },
  "& h3": { fontSize: "1.1rem" },
  "& h4, & h5, & h6": { fontSize: "1rem" },
  "& ul, & ol": { my: 1, pl: 3 },
  "& li": { my: 0.25 },
  "& li > p": { my: 0 },
  "& a": { color: "primary.main", textDecoration: "underline" },
  "& strong": { fontWeight: 700, color: "text.primary" },
  "& blockquote": {
    my: 1,
    ml: 0,
    pl: 2,
    borderLeft: "3px solid",
    borderColor: "divider",
    color: "text.secondary",
  },
  "& code": {
    fontFamily: "monospace",
    fontSize: "0.85em",
    bgcolor: "action.hover",
    px: 0.5,
    py: 0.125,
    borderRadius: 0.5,
  },
  "& pre": {
    my: 1,
    p: 1.5,
    bgcolor: "action.hover",
    borderRadius: 1,
    overflowX: "auto",
  },
  "& pre code": { bgcolor: "transparent", p: 0, fontSize: "0.8rem" },
  "& hr": { my: 1.5, border: 0, borderTop: "1px solid", borderColor: "divider" },
  "& img": { maxWidth: "100%", borderRadius: 1 },
  "& table": {
    my: 1,
    borderCollapse: "collapse",
    display: "block",
    overflowX: "auto",
  },
  "& th, & td": { border: "1px solid", borderColor: "divider", px: 1, py: 0.5 },
  "& th": { bgcolor: "action.hover", fontWeight: 700 },
};

export function Markdown({ children, sx }: { children: string; sx?: SxProps<Theme> }) {
  return (
    <Box sx={[baseSx, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </Box>
  );
}
