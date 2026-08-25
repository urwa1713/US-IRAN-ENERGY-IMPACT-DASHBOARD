// ————————————————————————————————————————————
// Dataset derived from Phase 2 / Phase 3 notebooks
// ————————————————————————————————————————————

export type Point = {
  key: string; // YYYY-MM
  label: string; // display label
  brent: number;
  petrol: number;
  diesel: number;
  usd: number;
};

// Anchor observations (Q1 -> January, Q3 -> July)
const ANCHORS: { ym: string; brent: number; petrol: number; usd: number }[] = [
  { ym: "2015-01", brent: 55, petrol: 78, usd: 102 },
  { ym: "2015-07", brent: 49, petrol: 71, usd: 104 },
  { ym: "2016-01", brent: 34, petrol: 62, usd: 105 },
  { ym: "2016-07", brent: 46, petrol: 66, usd: 105 },
  { ym: "2017-01", brent: 55, petrol: 71, usd: 105 },
  { ym: "2017-07", brent: 52, petrol: 74, usd: 105 },
  { ym: "2018-01", brent: 67, petrol: 88, usd: 111 },
  { ym: "2018-07", brent: 78, petrol: 98, usd: 124 },
  { ym: "2019-01", brent: 63, petrol: 96, usd: 139 },
  { ym: "2019-07", brent: 61, petrol: 114, usd: 158 },
  { ym: "2020-01", brent: 32, petrol: 96, usd: 160 },
  { ym: "2020-07", brent: 43, petrol: 103, usd: 165 },
  { ym: "2021-01", brent: 62, petrol: 111, usd: 157 },
  { ym: "2021-07", brent: 73, petrol: 123, usd: 168 },
  { ym: "2022-01", brent: 100, petrol: 160, usd: 185 },
  { ym: "2022-07", brent: 94, petrol: 235, usd: 224 },
  { ym: "2023-01", brent: 81, petrol: 267, usd: 275 },
  { ym: "2023-07", brent: 87, petrol: 305, usd: 287 },
  { ym: "2024-01", brent: 83, petrol: 279, usd: 279 },
  { ym: "2024-07", brent: 80, petrol: 265, usd: 278 },
  { ym: "2025-01", brent: 78, petrol: 259, usd: 280 },
  { ym: "2025-07", brent: 85, petrol: 272, usd: 281 },
  { ym: "2026-01", brent: 91, petrol: 288, usd: 283 },
];

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function ymToIndex(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}
function indexToYm(i: number) {
  const y = Math.floor(i / 12);
  const m = i % 12;
  return { y, m, key: `${y}-${String(m + 1).padStart(2, "0")}` };
}

function round(n: number, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

// Linear interpolation between anchors -> full monthly series
export const MONTHLY: Point[] = (() => {
  const out: Point[] = [];
  for (let a = 0; a < ANCHORS.length - 1; a++) {
    const s = ANCHORS[a];
    const e = ANCHORS[a + 1];
    const si = ymToIndex(s.ym);
    const ei = ymToIndex(e.ym);
    for (let i = si; i < ei; i++) {
      const t = (i - si) / (ei - si);
      const brent = round(s.brent + (e.brent - s.brent) * t);
      const petrol = round(s.petrol + (e.petrol - s.petrol) * t);
      const usd = round(s.usd + (e.usd - s.usd) * t);
      const { y, m, key } = indexToYm(i);
      out.push({
        key,
        label: `${MONTH_ABBR[m]} ${String(y).slice(2)}`,
        brent,
        petrol,
        diesel: round(petrol * 0.94 + 2),
        usd,
      });
    }
  }
  // final 6 months to Jun 2026, holding the last anchor trend
  const last = ANCHORS[ANCHORS.length - 1];
  const li = ymToIndex(last.ym);
  for (let i = li; i <= li + 5; i++) {
    const step = i - li;
    const { y, m, key } = indexToYm(i);
    const petrol = round(last.petrol + step * 1.6);
    out.push({
      key,
      label: `${MONTH_ABBR[m]} ${String(y).slice(2)}`,
      brent: round(last.brent + step * 0.5),
      petrol,
      diesel: round(petrol * 0.94 + 2),
      usd: round(last.usd + step * 0.4),
    });
  }
  return out;
})();

export function aggregate(points: Point[], frequency: "Monthly" | "Quarterly") {
  if (frequency === "Monthly") return points;
  const buckets = new Map<string, Point[]>();
  for (const p of points) {
    const [y, m] = p.key.split("-").map(Number);
    const q = Math.floor((m - 1) / 3) + 1;
    const k = `${y}-Q${q}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(p);
  }
  return Array.from(buckets.entries()).map(([k, rows]) => {
    const avg = (sel: (p: Point) => number) =>
      round(rows.reduce((a, r) => a + sel(r), 0) / rows.length);
    return {
      key: k,
      label: k.replace("20", "'"),
      brent: avg((r) => r.brent),
      petrol: avg((r) => r.petrol),
      diesel: avg((r) => r.diesel),
      usd: avg((r) => r.usd),
    } as Point;
  });
}

export const TIME_RANGES = [
  { id: "full", label: "Jan 2015 – Jun 2026", start: "2015-01", end: "2026-06" },
  { id: "d2020", label: "Jan 2020 – Jun 2026", start: "2020-01", end: "2026-06" },
  { id: "d2022", label: "Jan 2022 – Jun 2026", start: "2022-01", end: "2026-06" },
  { id: "d24", label: "Last 24 months", start: "2024-07", end: "2026-06" },
] as const;

export const COMMODITIES = [
  { id: "brent", label: "Brent Crude", unit: "USD/bbl", color: "var(--color-chart-4)" },
  { id: "petrol", label: "OGRA Petrol", unit: "PKR/L", color: "var(--color-chart-1)" },
  { id: "diesel", label: "OGRA Diesel", unit: "PKR/L", color: "var(--color-chart-2)" },
] as const;

export type CommodityId = (typeof COMMODITIES)[number]["id"];

/**
 * Event-study results (conflict_events.csv, 5-trading-day window around each event).
 *
 * IMPORTANT sign convention: `vaderCompound` measures NEWS SENTIMENT, not price
 * direction. Military escalation is strongly NEGATIVE sentiment but a POSITIVE
 * supply shock for Brent. `avgReaction` below is the mean 5-day % change in the
 * Brent settlement price and must never be derived by copying the sentiment sign.
 */
export const EVENTS = [
  {
    name: "Military",
    n: 46,
    avgReaction: 3.84,
    sd: 5.83,
    vaderCompound: -0.62,
    intensity: 0.81,
  },
  {
    name: "Diplomatic",
    n: 35,
    avgReaction: 1.52,
    sd: 4.62,
    vaderCompound: 0.21,
    intensity: 0.34,
  },
  {
    name: "Sanctions",
    n: 29,
    avgReaction: -0.63,
    sd: 4.71,
    vaderCompound: -0.38,
    intensity: 0.55,
  },
] as const;

export type EventRow = (typeof EVENTS)[number];

export const EVENT_COLORS: Record<string, string> = {
  Military: "var(--color-pos)",
  Sanctions: "var(--color-chart-3)",
  Diplomatic: "var(--color-chart-2)",
};

export const CORRELATIONS = [
  { label: "OGRA Diesel", value: 0.642 },
  { label: "OGRA Petrol", value: 0.638 },
  { label: "USD / PKR", value: 0.506 },
  { label: "USD / IRR", value: 0.463 },
  { label: "Pak Inflation", value: 0.433 },
  { label: "Pak GDP Growth", value: 0.304 },
  { label: "Conflict Intensity", value: 0.095 },
];

export const LAGS = [
  { m: "L0", v: 0.68 },
  { m: "L1", v: 0.651 },
  { m: "L2", v: 0.612 },
  { m: "L3", v: 0.576 },
  { m: "L4", v: 0.551 },
  { m: "L5", v: 0.533 },
  { m: "L6", v: 0.515 },
];

export const INTENSITY = [
  { name: "Low", n: 31, price: 66 },
  { name: "Medium", n: 88, price: 64 },
  { name: "High", n: 17, price: 80 },
];

export const MODEL_PERF = [
  { name: "Linear Reg.", r2: 0.945, rmse: 17.98 },
  { name: "Random Forest", r2: 0.985, rmse: 9.35 },
];

export const REGIONS = ["Pakistan", "Iran", "Global"] as const;
