"use client";

import { useEffect, useState } from "react";

import { healthApi, type HealthStatus } from "@/lib/api/health";
import { env } from "@/config/env";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: HealthStatus }
  | { kind: "error"; message: string };

const dotColor: Record<State["kind"], string> = {
  loading: "bg-amber-400",
  ok: "bg-emerald-500",
  error: "bg-rose-500",
};

/**
 * Client island that pings the FastAPI backend's readiness endpoint so the
 * landing page can show whether the API (and MongoDB) is reachable.
 */
export function BackendStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    healthApi
      .ready()
      .then((data) => active && setState({ kind: "ok", data }))
      .catch(
        (err: unknown) =>
          active &&
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "Unreachable",
          }),
      );
    return () => {
      active = false;
    };
  }, []);

  const label =
    state.kind === "loading"
      ? "Checking backend…"
      : state.kind === "ok"
        ? `API ${state.data.status} · DB ${state.data.database ?? "?"}`
        : `Backend unreachable`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor[state.kind]} ${
            state.kind === "loading" ? "animate-pulse" : ""
          }`}
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <code className="truncate font-mono text-xs text-black/50 dark:text-white/50">
        {env.apiUrl}
      </code>
      {state.kind === "error" && (
        <p className="text-xs text-rose-500">
          Start the backend, then reload. ({state.message})
        </p>
      )}
    </div>
  );
}
