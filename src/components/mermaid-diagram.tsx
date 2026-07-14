"use client";

import { useEffect, useId, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

/**
 * Renders one Mermaid diagram.
 *
 * Mermaid parses and lays out in the browser, so it can't run during SSR — the
 * library is imported lazily on mount, which also keeps its ~1MB out of the
 * bundle for every page that never shows a diagram.
 */
export function MermaidDiagram({ code }: { code: string }) {
  const reactId = useId();
  // Mermaid uses the id as a DOM/SVG id, and React's contains colons.
  const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict", // no click handlers / raw HTML from the source
          theme: "default",
          fontFamily: "inherit",
        });
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled.current) setSvg(rendered);
      } catch (err) {
        if (!cancelled.current) {
          setError(err instanceof Error ? err.message : "Couldn't render this diagram.");
        }
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        Couldn&apos;t render this diagram. Showing the source instead.
        <Box component="pre" sx={{ mt: 1, overflowX: "auto" }}>
          {code}
        </Box>
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        my: 2,
        display: "flex",
        justifyContent: "center",
        overflowX: "auto",
        "& svg": { maxWidth: "100%", height: "auto" },
      }}
      // The SVG comes from Mermaid's own renderer in `strict` mode, which
      // escapes any HTML in the diagram source.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {svg ? undefined : (
        <Box component="pre" sx={{ opacity: 0.5, fontSize: "0.8rem" }}>
          Rendering diagram…
        </Box>
      )}
    </Box>
  );
}
