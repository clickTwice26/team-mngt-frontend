"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Membership, Weekday, WorkArrangement, WorkMode } from "@/types/membership";

const MODE_LABELS: Record<WorkMode, string> = {
  task_based: "Task based",
  hourly: "Hourly basis",
  contractual: "Contractual",
};

const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const dayLabel = (day: Weekday) => day.charAt(0).toUpperCase() + day.slice(1, 3);

/** One-line summary of a member's working method, shown in the member list. */
export function WorkSummary({ work }: { work: WorkArrangement }) {
  if (work.mode === "hourly") {
    const off =
      work.off_days.length > 0
        ? ` · Off ${work.off_days.map(dayLabel).join(", ")}`
        : " · No off days";
    return (
      <Typography variant="caption" color="text.secondary">
        {MODE_LABELS.hourly} · {work.hours_per_week}h/week{off}
      </Typography>
    );
  }
  if (work.mode === "contractual") {
    return (
      <Typography variant="caption" color="text.secondary">
        {MODE_LABELS.contractual} · {work.commitment}
      </Typography>
    );
  }
  return (
    <Typography variant="caption" color="text.secondary">
      {MODE_LABELS.task_based}
    </Typography>
  );
}

/** Compact chip for the member row. */
export function WorkChip({ work }: { work: WorkArrangement }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={MODE_LABELS[work.mode]}
      color={work.mode === "task_based" ? "default" : "primary"}
    />
  );
}

/**
 * Platform-developer-only editor for how a member works on this team.
 *
 * Task based asks for nothing further; hourly asks for hours per week and off
 * days; contractual asks for the commitment text.
 */
export function WorkArrangementDialog({
  open,
  membership,
  teamId,
  token,
  onClose,
  onSaved,
}: {
  open: boolean;
  membership: Membership;
  teamId: string;
  token: string;
  onClose: () => void;
  onSaved: (updated: Membership) => void;
}) {
  const [mode, setMode] = useState<WorkMode>(membership.work.mode);
  const [hours, setHours] = useState(
    membership.work.hours_per_week != null ? String(membership.work.hours_per_week) : "",
  );
  const [offDays, setOffDays] = useState<Weekday[]>(membership.work.off_days);
  const [commitment, setCommitment] = useState(membership.work.commitment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoursNumber = Number(hours);
  const hoursValid =
    hours.trim() !== "" && Number.isInteger(hoursNumber) && hoursNumber >= 1 && hoursNumber <= 168;

  // Mirrors the server's per-mode requirements.
  const canSubmit =
    mode === "task_based" ||
    (mode === "hourly" && hoursValid) ||
    (mode === "contractual" && commitment.trim().length > 0);

  const toggleOffDay = (day: Weekday) =>
    setOffDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Send only what the chosen mode uses; the server clears the rest anyway,
      // but this keeps the request honest about what was intended.
      const payload: WorkArrangement = {
        mode,
        hours_per_week: mode === "hourly" ? hoursNumber : null,
        off_days: mode === "hourly" ? offDays : [],
        commitment: mode === "contractual" ? commitment.trim() : null,
      };
      const updated = await teamsApi.setMemberWork(
        token,
        teamId,
        membership.user.id,
        payload,
      );
      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save the working method.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <DialogTitle>
          Working method — {membership.user.full_name || membership.user.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              select
              label="Method"
              value={mode}
              onChange={(e) => setMode(e.target.value as WorkMode)}
              fullWidth
            >
              <MenuItem value="task_based">Task based</MenuItem>
              <MenuItem value="hourly">Hourly basis</MenuItem>
              <MenuItem value="contractual">Contractual</MenuItem>
            </TextField>

            {mode === "task_based" && (
              <Typography variant="body2" color="text.secondary">
                Nothing further to set — the member works task by task.
              </Typography>
            )}

            {mode === "hourly" && (
              <>
                <TextField
                  type="number"
                  label="Hours per week"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  error={hours.trim() !== "" && !hoursValid}
                  helperText={
                    hours.trim() !== "" && !hoursValid
                      ? "Enter a whole number between 1 and 168."
                      : " "
                  }
                  slotProps={{ htmlInput: { min: 1, max: 168, step: 1 } }}
                  fullWidth
                  required
                />
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Off days
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                    {WEEKDAYS.map((day) => (
                      <Chip
                        key={day}
                        label={dayLabel(day)}
                        clickable
                        color={offDays.includes(day) ? "primary" : "default"}
                        variant={offDays.includes(day) ? "filled" : "outlined"}
                        onClick={() => toggleOffDay(day)}
                      />
                    ))}
                  </Stack>
                </Stack>
              </>
            )}

            {mode === "contractual" && (
              <TextField
                label="Commitment"
                value={commitment}
                onChange={(e) => setCommitment(e.target.value)}
                placeholder="What has this member committed to?"
                fullWidth
                required
                multiline
                minRows={3}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit || submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
