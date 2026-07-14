"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";

import type { Meeting } from "@/types/meeting";

export type MeetingStatus = "upcoming" | "live" | "ended";

/**
 * Where a meeting sits relative to now.
 *
 * A meeting has no explicit end — it ends at `scheduled_at + duration_minutes`,
 * which is what makes the Join button stop being useful.
 */
export function meetingStatus(meeting: Meeting, now: number = Date.now()): MeetingStatus {
  const start = dayjs(meeting.scheduled_at).valueOf();
  const end = start + meeting.duration_minutes * 60_000;
  if (now >= end) return "ended";
  if (now >= start) return "live";
  return "upcoming";
}

/**
 * A clock that ticks every 30s, so a meeting flips from upcoming → live →
 * ended while someone is looking at the page, instead of only on reload.
 *
 * 30s is fine for a boundary measured in minutes, and it's cheap.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
