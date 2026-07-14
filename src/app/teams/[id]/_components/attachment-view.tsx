"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

import type { TaskAttachment } from "@/types/task";

/** Renders a single attachment inline: image thumbnail, audio/video player, or file link.
 *  Shared by the task list and the task discussion thread. */
export function AttachmentView({ attachment }: { attachment: TaskAttachment }) {
  if (attachment.kind === "image") {
    return (
      <Link href={attachment.url} target="_blank" rel="noopener" sx={{ display: "inline-block" }}>
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
          }}
        />
      </Link>
    );
  }
  if (attachment.kind === "audio") {
    return (
      <Box sx={{ minWidth: 260 }}>
        <audio controls preload="metadata" style={{ width: "100%" }} src={attachment.url}>
          <track kind="captions" />
        </audio>
      </Box>
    );
  }
  if (attachment.kind === "video") {
    return (
      <Box
        component="video"
        controls
        preload="metadata"
        src={attachment.url}
        sx={{ width: 260, maxHeight: 180, borderRadius: 1, bgcolor: "black" }}
      />
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
