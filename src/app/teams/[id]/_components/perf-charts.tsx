"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/**
 * Chart primitives for the member performance page.
 *
 * Colours come from the validated categorical palette (worst adjacent CVD ΔE
 * 37.7). Three of those slots sit under 3:1 contrast on a light surface, so the
 * relief rule applies: every mark carries a visible direct label, and identity
 * is never colour-alone (each category is also named in a legend).
 *
 * Bars animate up from the baseline on mount — a transition on the geometry,
 * not a loop, so it plays once and settles. Respects reduced-motion.
 */

export const SERIES = {
  blue: "#2a78d6",
  aqua: "#1baf7a",
  yellow: "#eda100",
  red: "#e34948",
} as const;

const INK_MUTED = "#898781";
const GRID = "#e1e0d9";

/**
 * Bars grow from 0 on mount: 0 on the first paint, then 1, so the CSS
 * transition has something to run between.
 *
 * Under `prefers-reduced-motion` it starts at 1 — the geometry never changes,
 * so no transition fires. That's the only way to honour the setting inside an
 * SVG, where a media query can't reach the inline style.
 */
function useGrowth(): number {
  const [grown, setGrown] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return grown ? 1 : 0;
}

export function StatTile({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 140 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: color ?? "text.primary",
          // The number counts up alongside the bars settling in.
          animation: "perf-fade-in 420ms ease-out both",
          "@keyframes perf-fade-in": {
            from: { opacity: 0, transform: "translateY(6px)" },
            to: { opacity: 1, transform: "none" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        {value}
        {suffix && (
          <Typography component="span" variant="h6" color="text.secondary">
            {suffix}
          </Typography>
        )}
      </Typography>
    </Paper>
  );
}

export interface VBar {
  label: string;
  /** Shown under the bar; kept short so 14 of them fit. */
  tick: string;
  value: number;
  /** Formatted for the direct label and the tooltip. */
  display: string;
}

/**
 * Vertical bars over time. One series, so no legend — the title names it.
 * A dashed reference line marks the target when there is one.
 */
export function TimeBars({
  bars,
  reference,
  referenceLabel,
  format,
}: {
  bars: VBar[];
  reference?: number | null;
  referenceLabel?: string;
  format: (value: number) => string;
}) {
  const growth = useGrowth();

  const W = 720;
  const H = 240;
  const PAD_L = 44;
  const PAD_B = 28;
  const PAD_T = 16;
  const plotW = W - PAD_L - 8;
  const plotH = H - PAD_B - PAD_T;

  const peak = Math.max(...bars.map((b) => b.value), reference ?? 0, 1);
  // Round the axis up to something readable rather than to the raw peak.
  const top = Math.ceil(peak / 60) * 60 || 60;
  const y = (v: number) => PAD_T + plotH - (v / top) * plotH;

  // A 2px surface gap between adjacent bars (the spacer rule).
  const slot = plotW / bars.length;
  const barW = Math.max(6, slot - 2);

  const ticks = [0, top / 2, top];

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Hours logged per period"
        style={{ display: "block", minWidth: 480 }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_L}
              x2={W - 8}
              y1={y(t)}
              y2={y(t)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={PAD_L - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill={INK_MUTED}
            >
              {format(t)}
            </text>
          </g>
        ))}

        {reference != null && reference > 0 && (
          <>
            <line
              x1={PAD_L}
              x2={W - 8}
              y1={y(reference)}
              y2={y(reference)}
              stroke={SERIES.red}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <text x={W - 10} y={y(reference) - 6} textAnchor="end" fontSize={11} fill={SERIES.red}>
              {referenceLabel}
            </text>
          </>
        )}

        {bars.map((bar, i) => {
          const x = PAD_L + i * slot + (slot - barW) / 2;
          const full = plotH - (y(bar.value) - PAD_T);
          const h = full * growth;
          return (
            <g key={bar.label}>
              {/* rx gives the 4px rounded data-end; the bar is anchored to the
                  baseline, so the rounding only reads at the top. */}
              <rect
                x={x}
                y={PAD_T + plotH - h}
                width={barW}
                height={Math.max(h, bar.value > 0 ? 2 : 0)}
                rx={4}
                fill={SERIES.blue}
                style={{
                  transition: "height 620ms cubic-bezier(.2,.8,.2,1), y 620ms cubic-bezier(.2,.8,.2,1)",
                  transitionDelay: `${i * 28}ms`,
                }}
              >
                <title>{`${bar.label}: ${bar.display}`}</title>
              </rect>
              {/* Direct label — the contrast relief the palette check requires. */}
              {bar.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={PAD_T + plotH - h - 5}
                  textAnchor="middle"
                  fontSize={10}
                  fill={INK_MUTED}
                  style={{
                    opacity: growth,
                    transition: "opacity 400ms ease-out",
                    transitionDelay: `${300 + i * 28}ms`,
                  }}
                >
                  {bar.display}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill={INK_MUTED}
              >
                {bar.tick}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD_L}
          x2={W - 8}
          y1={PAD_T + plotH}
          y2={PAD_T + plotH}
          stroke={GRID}
          strokeWidth={1}
        />
      </svg>
    </Box>
  );
}

export interface HBar {
  label: string;
  value: number;
  color: string;
}

/** Horizontal category bars, each directly labelled with its count. */
export function CategoryBars({ bars }: { bars: HBar[] }) {
  const growth = useGrowth();
  const peak = Math.max(...bars.map((b) => b.value), 1);

  return (
    <Stack spacing={1.5}>
      {bars.map((bar, i) => (
        <Stack key={bar.label} spacing={0.5}>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {/* The swatch carries identity; the text stays in ink, never the
                  series colour. */}
              <Box
                sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: bar.color }}
              />
              <Typography variant="body2">{bar.label}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {bar.value}
            </Typography>
          </Stack>
          <Box
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: "action.hover",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                height: "100%",
                borderRadius: 1,
                bgcolor: bar.color,
                width: `${(bar.value / peak) * 100 * growth}%`,
                transition: "width 620ms cubic-bezier(.2,.8,.2,1)",
                transitionDelay: `${i * 60}ms`,
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              }}
            />
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

/** A ring showing one share, counting up on mount. */
export function CompletionRing({ percent }: { percent: number }) {
  const growth = useGrowth();
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (percent / 100) * circumference * growth;

  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${percent}% of tasks done`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={GRID}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={SERIES.aqua}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dasharray 800ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
      </svg>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {percent}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          done
        </Typography>
      </Box>
    </Box>
  );
}
