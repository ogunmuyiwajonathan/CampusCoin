import { formatCurrency } from "../lib/formatCurrency.js";

const TOOLTIP_WIDTH = 156;
const TOOLTIP_HEIGHT = 56;
const EDGE = 6;
// The donut's center label (total + caption) is a ~48px band we never cover.
const CENTER_HALF = 24;

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

// Custom Recharts tooltip: positioned from `coordinate` inside the chart box
// (the wrapper is pinned to 0,0 via wrapperStyle), clamped to the box edges
// and placed so it never covers the center total label.
export default function ChartTooltip({ active, payload, coordinate, bounds }) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0]?.payload;
  if (!entry || typeof entry.amount !== "number") return null;

  const { width, height } = bounds;
  const x = coordinate?.x ?? width / 2;
  const y = coordinate?.y ?? height / 2;

  const left = clamp(x - TOOLTIP_WIDTH / 2, EDGE, width - TOOLTIP_WIDTH - EDGE);
  const centerTop = height / 2 - CENTER_HALF;
  const centerBottom = height / 2 + CENTER_HALF;

  const above = y - TOOLTIP_HEIGHT - 14;
  const below = y + 14;
  let top;
  if (above >= EDGE && above + TOOLTIP_HEIGHT <= centerTop - 2) {
    top = above;
  } else if (below >= centerBottom + 2 && below + TOOLTIP_HEIGHT <= height - EDGE) {
    top = below;
  } else {
    top = y < height / 2 ? EDGE : height - TOOLTIP_HEIGHT - EDGE;
  }
  top = clamp(top, EDGE, height - TOOLTIP_HEIGHT - EDGE);

  return (
    <div
      className="w-[156px] rounded-lg border border-slate-200 bg-surface px-3 py-2 shadow-card"
      style={{ position: "absolute", left, top, pointerEvents: "none" }}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: entry.color }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
        <span className="shrink-0 text-[11px] font-normal tabular-nums text-ink-500">
          {entry.percentage}%
        </span>
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-ink-900">
        {formatCurrency(entry.amount)}
      </p>
    </div>
  );
}
