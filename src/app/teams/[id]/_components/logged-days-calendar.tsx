"use client";

import Badge from "@mui/material/Badge";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import dayjs, { Dayjs } from "dayjs";

import type { WorkLogEntry } from "@/types/work-log";

/** Minutes logged per local calendar day, keyed YYYY-MM-DD. */
export function minutesByDay(entries: WorkLogEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = dayjs(entry.started_at).format("YYYY-MM-DD");
    totals.set(key, (totals.get(key) ?? 0) + entry.minutes);
  }
  return totals;
}

type LoggedDayProps = PickerDayProps & { loggedDays?: Map<string, number> };

function LoggedDay(props: LoggedDayProps) {
  const { loggedDays, day, outsideCurrentMonth, ...other } = props;
  const hasEntries =
    !outsideCurrentMonth && (loggedDays?.get(day.format("YYYY-MM-DD")) ?? 0) > 0;

  return (
    <Badge
      overlap="circular"
      variant="dot"
      color="primary"
      invisible={!hasEntries}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <PickerDay day={day} outsideCurrentMonth={outsideCurrentMonth} {...other} />
    </Badge>
  );
}

/**
 * A month calendar that dots the days with logged hours.
 *
 * Shared by the member's own "My Hours" tab and a founder's read-only view of
 * someone else's log — so both mark the same days the same way.
 */
export function LoggedDaysCalendar({
  entries,
  value,
  onChange,
}: {
  entries: WorkLogEntry[];
  value: Dayjs;
  onChange: (day: Dayjs) => void;
}) {
  const loggedDays = minutesByDay(entries);

  return (
    <Paper variant="outlined" sx={{ flexShrink: 0 }}>
      <DateCalendar
        value={value}
        onChange={(next) => next && onChange(next.startOf("day"))}
        slots={{ day: LoggedDay }}
        // MUI's own pattern for a custom slot prop: `slotProps.day` is typed
        // against the built-in day, which knows nothing about `loggedDays`.
        slotProps={{ day: { loggedDays } as Partial<LoggedDayProps> }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", px: 2, pb: 1.5 }}
      >
        Dotted days have logged hours.
      </Typography>
    </Paper>
  );
}
