"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import { AppShell } from "@/components/layout/app-shell";
import { MarkdownDocument } from "@/components/markdown-document";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { attachmentsApi } from "@/lib/api/attachments";

type State =
  | { kind: "loading" }
  | { kind: "ok"; content: string }
  | { kind: "error"; message: string };

function DocumentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, loading: authLoading, isAuthenticated } = useAuth();

  const url = searchParams.get("url");
  const name = searchParams.get("name") ?? "Document";

  const [state, setState] = useState<State>({ kind: "loading" });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    // Deferred: a synchronous setState in an effect body trips React's
    // cascading-render rule.
    queueMicrotask(() => {
      if (!url) {
        setState({ kind: "error", message: "No document was specified." });
        return;
      }
      attachmentsApi
        .getMarkdown(token, url)
        .then((doc) => setState({ kind: "ok", content: doc.content }))
        .catch((err: unknown) =>
          setState({
            kind: "error",
            message:
              err instanceof ApiError ? err.message : "Failed to load the document.",
          }),
        );
    });
  }, [token, url]);

  /** Save the raw source, without a round-trip to the bucket. */
  const downloadRaw = () => {
    if (state.kind !== "ok") return;
    const blob = new Blob([state.content], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name.endsWith(".md") ? name : `${name}.md`;
    a.click();
    URL.revokeObjectURL(href);
    setMenuAnchor(null);
  };

  /**
   * PDF via the browser's own print pipeline ("Save as PDF").
   *
   * The print stylesheet below hides the app chrome and prints only the
   * document, so the output is real, selectable text with working page breaks —
   * which a canvas-to-PDF library can't give you.
   */
  const downloadPdf = () => {
    setMenuAnchor(null);
    // Let the menu close before the (blocking) print dialog opens.
    setTimeout(() => window.print(), 50);
  };

  return (
    <AppShell>
      {/* Print rules live here so they can reach the app shell, which this page
          doesn't own. `@page` sets the PDF's margins. */}
      <style>{`
        @media print {
          @page { margin: 18mm 16mm; }
          body { background: #fff !important; }
          header, nav, aside, .MuiDrawer-root, .MuiAppBar-root { display: none !important; }
          .doc-no-print { display: none !important; }
          .doc-print-area {
            position: static !important;
            box-shadow: none !important;
            border: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
          main { padding: 0 !important; }
        }
      `}</style>

      <Stack spacing={3} sx={{ maxWidth: 900 }}>
        <Box className="doc-no-print">
          <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => router.back()}>
            Back
          </Button>
        </Box>

        <Stack
          className="doc-no-print"
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
            <DescriptionIcon color="action" />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }} noWrap>
              {name}
            </Typography>
            <Chip size="small" variant="outlined" label="Markdown" />
          </Stack>

          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            endIcon={<ArrowDropDownIcon />}
            disabled={state.kind !== "ok"}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            Download
          </Button>
          <Menu
            anchorEl={menuAnchor}
            open={menuAnchor !== null}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={downloadRaw}>
              <ListItemIcon>
                <DescriptionIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Raw Markdown" secondary=".md source" />
            </MenuItem>
            <MenuItem onClick={downloadPdf}>
              <ListItemIcon>
                <PictureAsPdfIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="PDF" secondary="Rendered, via Save as PDF" />
            </MenuItem>
          </Menu>
        </Stack>

        {state.kind === "loading" && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading…</Typography>
          </Stack>
        )}

        {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

        {state.kind === "ok" && (
          <Paper variant="outlined" className="doc-print-area" sx={{ p: { xs: 3, sm: 5 } }}>
            <MarkdownDocument>{state.content}</MarkdownDocument>
          </Paper>
        )}
      </Stack>
    </AppShell>
  );
}

function DocumentPageFallback() {
  return (
    <AppShell>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading…</Typography>
      </Stack>
    </AppShell>
  );
}

// `useSearchParams` needs a Suspense boundary above it.
export default function DocumentPage() {
  return (
    <Suspense fallback={<DocumentPageFallback />}>
      <DocumentPageContent />
    </Suspense>
  );
}
