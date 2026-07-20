"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import MicIcon from "@mui/icons-material/Mic";
import VideocamIcon from "@mui/icons-material/Videocam";
import VisibilityIcon from "@mui/icons-material/Visibility";

import type { AttachmentKind, TaskAttachment } from "@/types/task";

/**
 * Which mounted picker owns a window-wide drop.
 *
 * Several can be on screen at once — a thread's composer, an open reply
 * composer, a dialog's picker — and a file dropped on empty space belongs to
 * exactly one of them. The most recently mounted wins, which is the one the
 * user just opened (a reply box, or a modal), and therefore the one they mean.
 */
const dropStack: string[] = [];

function claimDropTarget(id: string): () => void {
  dropStack.push(id);
  return () => {
    const i = dropStack.lastIndexOf(id);
    if (i !== -1) dropStack.splice(i, 1);
  };
}

const ownsWindowDrop = (id: string) => dropStack[dropStack.length - 1] === id;

/** True when a drag actually carries files (not a text or link drag). */
function dragHasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/**
 * The one attachment control the whole app uses.
 *
 * Callers say *what* is allowed and *how to upload*; everything else — the
 * picker modal, drag-and-drop, per-kind limits, progress, errors, previews and
 * removal — lives here. Before this existed the same ~60 lines of upload
 * handling were copy-pasted into the task dialog, the work log dialog and the
 * comment composer, and each had drifted.
 *
 * ```tsx
 * <AttachmentPicker
 *   value={attachments}
 *   onChange={setAttachments}
 *   upload={(file) => teamsApi.uploadTaskAttachment(token, teamId, file)}
 *   allow={["image", "video", "markdown"]}
 *   limits={{ video: 1 }}
 *   onUploadingChange={setUploading}
 * />
 * ```
 */

type PickableKind = AttachmentKind;

interface KindSpec {
  label: string;
  hint: string;
  /** The `accept` attribute for this kind's file input. */
  accept: string;
  icon: React.ReactNode;
  multiple: boolean;
}

const KINDS: Record<PickableKind, KindSpec> = {
  image: {
    label: "Image",
    hint: "JPEG, PNG, WEBP, GIF · up to 10MB",
    accept: "image/jpeg,image/png,image/webp,image/gif",
    icon: <ImageIcon />,
    multiple: true,
  },
  video: {
    label: "Video",
    hint: "MP4, WEBM, MOV · up to 100MB",
    accept: "video/mp4,video/webm,video/quicktime,video/ogg",
    icon: <VideocamIcon />,
    multiple: false,
  },
  audio: {
    label: "Voice",
    hint: "MP3, M4A, WAV, OGG · up to 25MB",
    accept: "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/webm,audio/ogg",
    icon: <MicIcon />,
    multiple: true,
  },
  markdown: {
    label: "Markdown",
    // Browsers disagree on the type for a .md file, so the extensions are
    // listed too — the server re-checks by extension.
    hint: "Renders in-app · up to 2MB",
    accept: ".md,.markdown,text/markdown",
    icon: <DescriptionIcon />,
    multiple: true,
  },
  file: {
    label: "File",
    hint: "PDF, text, or ZIP · up to 50MB",
    accept: ".pdf,.txt,.zip,application/pdf,text/plain,application/zip",
    icon: <AttachFileIcon />,
    multiple: true,
  },
};

/**
 * Guess a kind from a File, so drag-and-drop can route to the right rules.
 *
 * Extension is checked before MIME type for Markdown, because browsers send a
 * `.md` as `text/plain` — the same type as a `.txt`. Getting that order wrong
 * would file every Markdown document away as an opaque download. This mirrors
 * the server's own `classify()`.
 */
function kindOf(file: File): PickableKind | null {
  const name = file.name.toLowerCase();
  if (/\.(md|markdown)$/.test(name)) return "markdown";

  const type = file.type;
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";

  if (
    /\.(pdf|txt|zip)$/.test(name) ||
    type === "application/pdf" ||
    type === "text/plain" ||
    type.includes("zip")
  ) {
    return "file";
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentPreview({ attachment }: { attachment: TaskAttachment }) {
  if (attachment.kind === "image") {
    return (
      <Box
        component="img"
        src={attachment.url}
        alt={attachment.filename}
        sx={{ width: 40, height: 40, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }}
      />
    );
  }
  const icon =
    attachment.kind === "video" ? (
      <VideocamIcon color="action" />
    ) : attachment.kind === "audio" ? (
      <MicIcon color="action" />
    ) : attachment.kind === "markdown" ? (
      <DescriptionIcon color="primary" />
    ) : (
      <AttachFileIcon color="action" />
    );
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: 0.5,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
      }}
    >
      {icon}
    </Box>
  );
}

/** What a parent can drive on the picker imperatively — used by the comment
 *  composer to push clipboard-pasted images through the same upload path. */
export interface AttachmentPickerHandle {
  /** Upload and attach these files, honouring the same allow-list and limits
   *  as a drop or a manual pick. */
  addFiles: (files: File[]) => void;
}

export const AttachmentPicker = forwardRef<AttachmentPickerHandle, {
  value: TaskAttachment[];
  onChange: (next: TaskAttachment[]) => void;
  /** Uploads one file and returns its stored metadata. */
  upload: (file: File) => Promise<TaskAttachment>;
  allow?: PickableKind[];
  /** Max attachments of a kind, e.g. `{ video: 1 }`. Unlisted kinds are unlimited. */
  limits?: Partial<Record<PickableKind, number>>;
  label?: string;
  disabled?: boolean;
  /** Lets a parent form disable submit while an upload is in flight. */
  onUploadingChange?: (uploading: boolean) => void;
  /** Accept a file dropped anywhere on the page, not just inside the modal. */
  windowDrop?: boolean;
}>(function AttachmentPicker({
  value,
  onChange,
  upload,
  allow = ["image", "video", "markdown"],
  limits,
  label = "Attachments",
  disabled,
  onUploadingChange,
  windowDrop = true,
}, ref) {
  const instanceId = useId();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<TaskAttachment | null>(null);
  const [windowDragging, setWindowDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingKind = useRef<PickableKind | null>(null);

  const countOf = (kind: PickableKind) => value.filter((a) => a.kind === kind).length;
  const limitOf = (kind: PickableKind) => limits?.[kind];

  const setUploadingBoth = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  /**
   * Upload files, enforcing per-kind limits as we go.
   *
   * A kind at its limit *replaces* rather than rejects — picking a second video
   * when only one is allowed swaps it, which is what someone means by picking
   * again. Limits are re-derived from the accumulating list so a multi-file drop
   * can't slip two videos past a limit of one.
   */
  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setUploadingBoth(true);
    setProgress({ done: 0, total: files.length });

    let next = [...value];
    const rejected: string[] = [];

    try {
      for (const [i, file] of files.entries()) {
        const kind = kindOf(file);
        if (!kind || !allow.includes(kind)) {
          rejected.push(file.name);
          setProgress({ done: i + 1, total: files.length });
          continue;
        }

        const uploaded = await upload(file);
        const limit = limitOf(kind);
        if (limit !== undefined) {
          const sameKind = next.filter((a) => a.kind === kind);
          if (sameKind.length >= limit) {
            // Drop the oldest of this kind to make room for the new one.
            const drop = sameKind.slice(0, sameKind.length - limit + 1);
            next = next.filter((a) => !drop.includes(a));
          }
        }
        next = [...next, uploaded];
        onChange(next);
        setProgress({ done: i + 1, total: files.length });
      }

      if (rejected.length > 0) {
        setError(
          `Skipped ${rejected.join(", ")} — not an allowed file type here.`,
        );
      } else {
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingBoth(false);
      setProgress(null);
    }
  };

  const pickKind = (kind: PickableKind) => {
    pendingKind.current = kind;
    const input = inputRef.current;
    if (!input) return;
    input.accept = KINDS[kind].accept;
    input.multiple = KINDS[kind].multiple;
    input.click();
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    void uploadFiles(files);
  };

  const remove = (url: string) => onChange(value.filter((a) => a.url !== url));

  // The latest uploader, read from inside the window listeners — so they can be
  // registered once instead of being torn down and rebuilt on every render.
  // Assigned in an effect, not during render, which React forbids.
  const uploadFilesRef = useRef(uploadFiles);
  useEffect(() => {
    uploadFilesRef.current = uploadFiles;
  });

  // Let a parent (the comment composer) hand us pasted images, so they go
  // through the same limits, progress and error handling as any other upload.
  useImperativeHandle(
    ref,
    () => ({
      addFiles: (files: File[]) => {
        if (disabled) return;
        void uploadFilesRef.current(files);
      },
    }),
    [disabled],
  );

  // Claim ownership of window-wide drops while mounted. Re-runs only when the
  // feature is toggled, so the stack order tracks mount order.
  useEffect(() => {
    if (!windowDrop || disabled) return;
    return claimDropTarget(instanceId);
  }, [windowDrop, disabled, instanceId]);

  useEffect(() => {
    if (!windowDrop || disabled) return;

    // `dragleave` fires every time the cursor crosses into a child element, so
    // a boolean would flicker. Counting enters against leaves is the standard
    // fix: the drag is over the window while the count is positive.
    let depth = 0;

    const onDragEnter = (e: DragEvent) => {
      if (!dragHasFiles(e) || !ownsWindowDrop(instanceId)) return;
      depth += 1;
      setWindowDragging(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!dragHasFiles(e) || !ownsWindowDrop(instanceId)) return;
      // Without this the browser navigates to the file instead of letting us
      // handle the drop.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const onDragLeave = (e: DragEvent) => {
      if (!dragHasFiles(e) || !ownsWindowDrop(instanceId)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setWindowDragging(false);
    };

    const onDrop = (e: DragEvent) => {
      if (!dragHasFiles(e) || !ownsWindowDrop(instanceId)) return;
      e.preventDefault();
      depth = 0;
      setWindowDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) void uploadFilesRef.current(files);
    };

    // A drag that ends outside the window (Esc, or dropped elsewhere) never
    // fires `dragleave`, so the overlay would stick.
    const onDragEnd = () => {
      depth = 0;
      setWindowDragging(false);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onDragEnd);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onDragEnd);
    };
  }, [windowDrop, disabled, instanceId]);

  const allowedLabels = allow.map((k) => KINDS[k].label).join(", ");

  return (
    <Box>
      {/* Drop anywhere on the page. Only the owning picker renders this, so two
          composers can't both claim the same file. */}
      <Backdrop
        open={windowDragging}
        sx={(theme) => ({
          zIndex: theme.zIndex.modal + 1,
          color: "#fff",
          bgcolor: "rgba(0,0,0,0.6)",
          // The overlay must not eat the drop event itself — the window
          // listener handles it.
          pointerEvents: "none",
        })}
      >
        <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", px: 4 }}>
          <Box
            sx={{
              p: 4,
              border: "3px dashed",
              borderColor: "rgba(255,255,255,0.7)",
              borderRadius: 3,
            }}
          >
            <AttachFileIcon sx={{ fontSize: 56, mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Drop to attach
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              {allowedLabels}
            </Typography>
          </Box>
        </Stack>
      </Backdrop>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: value.length ? 1 : 0 }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Button
          size="small"
          startIcon={<AttachFileIcon />}
          disabled={disabled || uploading}
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          Add attachment
        </Button>
        {uploading && <CircularProgress size={16} />}
      </Stack>

      {value.length > 0 && (
        <Stack spacing={1}>
          {value.map((a) => (
            <Paper
              key={a.url}
              variant="outlined"
              sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}
            >
              <AttachmentPreview attachment={a} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" noWrap>
                  {a.filename}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {KINDS[a.kind as PickableKind]?.label ?? "File"} · {formatBytes(a.size)}
                </Typography>
              </Box>
              <Tooltip title="Preview">
                <IconButton size="small" onClick={() => setPreview(a)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => remove(a.url)} disabled={disabled}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Full-size preview — every caller gets it, not just the task dialog. */}
      <Dialog open={preview !== null} onClose={() => setPreview(null)} fullWidth maxWidth="md">
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography component="span" noWrap sx={{ fontWeight: 600, mr: 2 }}>
            {preview?.filename}
          </Typography>
          <IconButton aria-label="Close preview" onClick={() => setPreview(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {preview?.kind === "image" && (
            <Box
              component="img"
              src={preview.url}
              alt={preview.filename}
              sx={{ display: "block", mx: "auto", maxWidth: "100%", maxHeight: "70vh" }}
            />
          )}
          {preview?.kind === "audio" && (
            <audio controls autoPlay style={{ width: "100%" }} src={preview.url}>
              <track kind="captions" />
            </audio>
          )}
          {preview?.kind === "video" && (
            <Box
              component="video"
              controls
              autoPlay
              src={preview.url}
              sx={{ display: "block", mx: "auto", maxWidth: "100%", maxHeight: "70vh" }}
            />
          )}
          {preview?.kind === "markdown" && (
            <Stack spacing={2} sx={{ py: 2 }}>
              <Typography color="text.secondary">
                Markdown documents open in the reader, where they render in full.
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  component={NextLink}
                  href={`/documents?url=${encodeURIComponent(
                    preview.url,
                  )}&name=${encodeURIComponent(preview.filename)}`}
                  target="_blank"
                >
                  Open {preview.filename}
                </Button>
              </Box>
            </Stack>
          )}
          {preview?.kind === "file" &&
            (preview.content_type === "application/pdf" ? (
              // PDFs preview inline; text and zip have nothing useful to show.
              <Box
                component="iframe"
                src={preview.url}
                title={preview.filename}
                sx={{ width: "100%", height: "70vh", border: 0 }}
              />
            ) : (
              <Stack spacing={2} sx={{ py: 2, alignItems: "flex-start" }}>
                <Typography color="text.secondary">
                  {formatBytes(preview.size)} · opens outside the app.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  href={preview.url}
                  target="_blank"
                  rel="noopener"
                >
                  Open {preview.filename}
                </Button>
              </Stack>
            ))}
        </DialogContent>
      </Dialog>

      <input ref={inputRef} type="file" hidden onChange={handleInput} />

      <Dialog open={open} onClose={() => !uploading && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add an attachment</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Drop zone — accepts anything allowed, routed by its own type. */}
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                if (!uploading) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (uploading) return;
                void uploadFiles(Array.from(e.dataTransfer.files));
              }}
              sx={{
                p: 3,
                textAlign: "center",
                border: "2px dashed",
                borderColor: dragging ? "primary.main" : "divider",
                borderRadius: 1,
                bgcolor: dragging ? "action.hover" : "transparent",
                transition: "border-color 120ms, background-color 120ms",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Drop files here, or choose a type below.
              </Typography>
            </Box>

            {uploading && progress && (
              <Box>
                <LinearProgress
                  variant={progress.total > 1 ? "determinate" : "indeterminate"}
                  value={(progress.done / progress.total) * 100}
                />
                <Typography variant="caption" color="text.secondary">
                  Uploading {progress.done + 1} of {progress.total}…
                </Typography>
              </Box>
            )}

            <Stack spacing={1}>
              {allow.map((kind) => {
                const spec = KINDS[kind];
                const limit = limitOf(kind);
                const count = countOf(kind);
                const atLimit = limit !== undefined && count >= limit;
                return (
                  <Paper
                    key={kind}
                    variant="outlined"
                    component="button"
                    type="button"
                    disabled={uploading}
                    onClick={() => pickKind(kind)}
                    sx={{
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      width: "100%",
                      textAlign: "left",
                      cursor: uploading ? "default" : "pointer",
                      bgcolor: "transparent",
                      font: "inherit",
                      color: "inherit",
                      "&:hover": { bgcolor: uploading ? "transparent" : "action.hover" },
                    }}
                  >
                    <Box sx={{ color: "primary.main", display: "flex" }}>{spec.icon}</Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {spec.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {spec.hint}
                      </Typography>
                    </Box>
                    {atLimit && (
                      <Chip
                        size="small"
                        label={limit === 1 ? "Replaces current" : `Max ${limit}`}
                        variant="outlined"
                      />
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={uploading}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});
