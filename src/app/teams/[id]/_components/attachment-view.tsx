"use client";

import { useState } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import type { TaskAttachment } from "@/types/task";

/**
 * Renders one already-uploaded attachment inline.
 *
 * Images and video open in a lightbox rather than navigating away to the raw
 * file — you stay in the thread you were reading. Markdown opens the in-app
 * reader; a plain file downloads.
 *
 * Shared by the task list, the work log, and both discussion threads.
 */
export function AttachmentView({ attachment }: { attachment: TaskAttachment }) {
  const [open, setOpen] = useState(false);

  const previewable = attachment.kind === "image" || attachment.kind === "video";

  const thumbnail = (() => {
    if (attachment.kind === "image") {
      return (
        <Box
          component="img"
          src={attachment.url}
          alt={attachment.filename}
          sx={{
            width: 120,
            height: 120,
            objectFit: "cover",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            display: "block",
          }}
        />
      );
    }
    // A poster frame with a play affordance: clicking opens the lightbox, so the
    // inline element must not be a <video> with its own controls competing for
    // the click.
    return (
      <Box
        sx={{
          position: "relative",
          width: 200,
          height: 120,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "black",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          component="video"
          src={attachment.url}
          preload="metadata"
          muted
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.25)",
            fontSize: 40,
          }}
        >
          ▶
        </Box>
      </Box>
    );
  })();

  if (previewable) {
    return (
      <>
        <Box
          component="button"
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Preview ${attachment.filename}`}
          sx={{
            p: 0,
            border: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            display: "inline-block",
            lineHeight: 0,
            borderRadius: 1,
            transition: "opacity 120ms",
            "&:hover": { opacity: 0.85 },
            "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
          }}
        >
          {thumbnail}
        </Box>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
          <DialogTitle
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
          >
            <Typography component="span" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
              {attachment.filename}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <IconButton
                aria-label="Open original"
                href={attachment.url}
                target="_blank"
                rel="noopener"
              >
                <OpenInNewIcon />
              </IconButton>
              <IconButton aria-label="Close preview" onClick={() => setOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: "black", display: "flex", justifyContent: "center" }}>
            {attachment.kind === "image" ? (
              <Box
                component="img"
                src={attachment.url}
                alt={attachment.filename}
                sx={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
              />
            ) : (
              <Box
                component="video"
                src={attachment.url}
                controls
                autoPlay
                sx={{ maxWidth: "100%", maxHeight: "80vh" }}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (attachment.kind === "audio") {
    // Nothing to preview — the player is the content.
    return (
      <Box sx={{ minWidth: 260 }}>
        <audio controls preload="metadata" style={{ width: "100%" }} src={attachment.url}>
          <track kind="captions" />
        </audio>
      </Box>
    );
  }

  if (attachment.kind === "markdown") {
    // Opens the in-app reader rather than downloading the raw file.
    return (
      <Chip
        icon={<DescriptionIcon />}
        label={attachment.filename}
        component={NextLink}
        href={`/documents?url=${encodeURIComponent(attachment.url)}&name=${encodeURIComponent(
          attachment.filename,
        )}`}
        clickable
        variant="outlined"
        color="primary"
      />
    );
  }

  // PDFs preview in a modal; text and zip have nothing to show, so they open out.
  if (attachment.content_type === "application/pdf") {
    return (
      <>
        <Chip
          icon={<InsertDriveFileIcon />}
          label={attachment.filename}
          onClick={() => setOpen(true)}
          clickable
          variant="outlined"
        />
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
          <DialogTitle
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
          >
            <Typography component="span" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
              {attachment.filename}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                href={attachment.url}
                target="_blank"
                rel="noopener"
              >
                Download
              </Button>
              <IconButton aria-label="Close preview" onClick={() => setOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box
              component="iframe"
              src={attachment.url}
              title={attachment.filename}
              sx={{ width: "100%", height: "80vh", border: 0, display: "block" }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Chip
      icon={<InsertDriveFileIcon />}
      label={attachment.filename}
      component={Link}
      href={attachment.url}
      target="_blank"
      rel="noopener"
      clickable
      variant="outlined"
    />
  );
}
