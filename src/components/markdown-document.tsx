"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Children, isValidElement } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { MermaidDiagram } from "@/components/mermaid-diagram";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

/**
 * Full-document Markdown renderer — the reading view for an uploaded `.md`.
 *
 * Deliberately a separate component from `Markdown` (which renders the short,
 * compact snippets inside comments and task descriptions). This one carries the
 * heavier machinery a real document needs: GFM tables and task lists, LaTeX math,
 * fenced-code highlighting, Mermaid diagrams, and Obsidian-style callouts.
 *
 * Raw HTML in the source is still NOT rendered (no `rehype-raw`), so an uploaded
 * file can't inject markup or script.
 */

/** Obsidian/GitHub callout syntax: `> [!NOTE]`, `> [!WARNING] Optional title`. */
const CALLOUTS: Record<
  string,
  { color: string; bg: string; icon: string; label: string }
> = {
  note: { color: "#2a78d6", bg: "rgba(42,120,214,0.08)", icon: "ℹ️", label: "Note" },
  info: { color: "#2a78d6", bg: "rgba(42,120,214,0.08)", icon: "ℹ️", label: "Info" },
  tip: { color: "#1baf7a", bg: "rgba(27,175,122,0.08)", icon: "💡", label: "Tip" },
  success: { color: "#0ca30c", bg: "rgba(12,163,12,0.08)", icon: "✅", label: "Success" },
  question: { color: "#eda100", bg: "rgba(237,161,0,0.08)", icon: "❓", label: "Question" },
  warning: { color: "#fab219", bg: "rgba(250,178,25,0.10)", icon: "⚠️", label: "Warning" },
  caution: { color: "#ec835a", bg: "rgba(236,131,90,0.10)", icon: "🔥", label: "Caution" },
  danger: { color: "#d03b3b", bg: "rgba(208,59,59,0.08)", icon: "🚨", label: "Danger" },
  important: { color: "#4a3aa7", bg: "rgba(74,58,167,0.08)", icon: "❗", label: "Important" },
  example: { color: "#4a3aa7", bg: "rgba(74,58,167,0.08)", icon: "📋", label: "Example" },
  quote: { color: "#898781", bg: "rgba(137,135,129,0.08)", icon: "💬", label: "Quote" },
}

/** Pull the leading plain text out of a rendered blockquote, to sniff `[!type]`. */
function leadingText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(leadingText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return leadingText(props.children);
  }
  return "";
}

const CALLOUT_RE = /^\s*\[!(\w+)\]\s*(.*)/;

function Blockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  const { children } = props;
  const text = leadingText(children);
  const match = CALLOUT_RE.exec(text);
  const spec = match ? CALLOUTS[match[1].toLowerCase()] : undefined;

  if (!match || !spec) {
    return <blockquote>{children}</blockquote>;
  }

  const title = match[2]?.trim() || spec.label;

  // Strip the `[!TYPE] title` marker from the first paragraph, keeping the rest
  // of the quote's content intact.
  const body = Children.toArray(children).map((child, i) => {
    if (i !== 0 || !isValidElement(child)) return child;
    const childProps = child.props as { children?: ReactNode };
    const inner = Children.toArray(childProps.children);
    const [first, ...rest] = inner;
    if (typeof first !== "string") return child;
    const stripped = first.replace(CALLOUT_RE, "").trimStart();
    if (!stripped && rest.length === 0) return null;
    return (
      <p key="callout-body">
        {stripped}
        {rest}
      </p>
    );
  });

  return (
    <Box
      sx={{
        my: 2,
        p: 2,
        borderLeft: "4px solid",
        borderColor: spec.color,
        borderRadius: 1,
        bgcolor: spec.bg,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontWeight: 700,
          color: spec.color,
          mb: 0.5,
        }}
      >
        <span aria-hidden>{spec.icon}</span>
        <span>{title}</span>
      </Box>
      <Box sx={{ "& > :last-child": { mb: 0 }, "& p": { my: 0.5 } }}>{body}</Box>
    </Box>
  );
}

const components: Components = {
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  blockquote: Blockquote,
  // A ```mermaid fence becomes a diagram; every other fence stays a code block.
  code: (props: ComponentPropsWithoutRef<"code"> & { className?: string }) => {
    const { className, children, ...rest } = props;
    if (className?.includes("language-mermaid")) {
      return <MermaidDiagram code={String(children).trim()} />;
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
  // Wrap every table so a wide one scrolls inside its own box rather than
  // squeezing its columns (or blowing out the page).
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <Box
      sx={{
        my: 2,
        overflowX: "auto",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <table {...props} />
    </Box>
  ),
};

const documentSx: SxProps<Theme> = {
  fontSize: "1rem",
  lineHeight: 1.75,
  color: "text.primary",
  wordBreak: "break-word",

  "& > :first-of-type": { mt: 0 },
  "& > :last-child": { mb: 0 },

  "& h1, & h2, & h3, & h4, & h5, & h6": {
    fontWeight: 700,
    lineHeight: 1.3,
    color: "text.primary",
    scrollMarginTop: "80px",
  },
  "& h1": { fontSize: "2rem", mt: 0, mb: 2 },
  "& h2": {
    fontSize: "1.5rem",
    mt: 4,
    mb: 1.5,
    pb: 0.5,
    borderBottom: "1px solid",
    borderColor: "divider",
  },
  "& h3": { fontSize: "1.2rem", mt: 3, mb: 1 },
  "& h4, & h5, & h6": { fontSize: "1rem", mt: 2, mb: 1 },

  "& p": { my: 1.5 },
  "& ul, & ol": { my: 1.5, pl: 3.5 },
  "& li": { my: 0.5 },
  "& li > p": { my: 0.5 },
  // GFM task lists — no bullet, and the checkbox sits inline.
  "& li:has(> input[type='checkbox'])": { listStyle: "none", ml: -2.5 },
  "& input[type='checkbox']": { mr: 1, verticalAlign: "middle" },

  "& a": { color: "primary.main", textDecoration: "underline" },
  "& strong": { fontWeight: 700 },
  "& hr": { my: 3, border: 0, borderTop: "1px solid", borderColor: "divider" },
  "& img": { maxWidth: "100%", borderRadius: 1, my: 1 },

  "& code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.85em",
    bgcolor: "action.hover",
    px: 0.5,
    py: 0.125,
    borderRadius: 0.5,
  },
  "& pre": {
    my: 2,
    p: 2,
    bgcolor: "action.hover",
    borderRadius: 1,
    overflowX: "auto",
    border: "1px solid",
    borderColor: "divider",
  },
  "& pre code": {
    bgcolor: "transparent",
    p: 0,
    fontSize: "0.85rem",
    lineHeight: 1.6,
  },

  // Tables: don't wrap cell text into a column-per-character mess. Cells stay on
  // one line and the wrapper scrolls; a deliberately long cell can still wrap.
  "& table": {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: "0.9rem",
  },
  "& th, & td": {
    border: "1px solid",
    borderColor: "divider",
    px: 1.5,
    py: 1,
    textAlign: "left",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  "& th": { bgcolor: "action.hover", fontWeight: 700 },
  "& tbody tr:nth-of-type(even)": { bgcolor: "action.hover" },

  // KaTeX: a display equation scrolls rather than overflowing the page.
  "& .katex-display": { overflowX: "auto", overflowY: "hidden", py: 1 },

  // Print / Save-as-PDF: drop the chrome, keep the document.
  "@media print": {
    "& pre, & table, & blockquote, & img": { pageBreakInside: "avoid" },
    "& h1, & h2, & h3": { pageBreakAfter: "avoid" },
  },
};

export function MarkdownDocument({ children }: { children: string }) {
  return (
    <Box sx={documentSx}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          // `ignoreMissing` so an unknown language in a fence degrades to plain
          // text instead of throwing the whole render away.
          [rehypeHighlight, { ignoreMissing: true, detect: true }],
        ]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </Box>
  );
}
