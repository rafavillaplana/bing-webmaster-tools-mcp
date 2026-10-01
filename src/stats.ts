/** Helpers to filter, aggregate and sort Bing performance rows (QueryStats). */

export interface StatRow {
  Date?: string;
  Impressions?: number;
  Clicks?: number;
  AvgImpressionPosition?: number;
  AvgClickPosition?: number;
  [key: string]: unknown;
}

export type SortField = "clicks" | "impressions" | "ctr" | "position";

export interface SummarizeOptions {
  keyField: string; // e.g. "Query"
  startDate?: string;
  endDate?: string;
  aggregate?: boolean;
  contains?: string;
  sortBy?: SortField;
  limit?: number;
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function inRange(date: string | undefined, start?: string, end?: string) {
  if (!date) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export function summarizeStats(rows: StatRow[], opts: SummarizeOptions) {
  const { keyField, startDate, endDate, aggregate = true, contains, sortBy = "clicks", limit = 50 } = opts;
  const needle = contains?.toLowerCase();

  const filtered = (rows ?? []).filter(
    (r) =>
      inRange(r.Date, startDate, endDate) &&
      (!needle || String(r[keyField] ?? "").toLowerCase().includes(needle)),
  );

  const dates = filtered.map((r) => r.Date).filter(Boolean).sort() as string[];
  let totalImpr = 0;
  let totalClicks = 0;

  type Out = Record<string, unknown> & { clicks: number; impressions: number; ctr: number; position: number | null };
  let out: Out[];

  if (aggregate) {
    const groups = new Map<string, { impr: number; clicks: number; posImprW: number; posClickW: number; clickPosN: number; weeks: number }>();
    for (const r of filtered) {
      const key = String(r[keyField] ?? "");
      const g = groups.get(key) ?? { impr: 0, clicks: 0, posImprW: 0, posClickW: 0, clickPosN: 0, weeks: 0 };
      const impr = r.Impressions ?? 0;
      const clicks = r.Clicks ?? 0;
      g.impr += impr;
      g.clicks += clicks;
      g.weeks += 1;
      if ((r.AvgImpressionPosition ?? -1) > 0) g.posImprW += (r.AvgImpressionPosition as number) * impr;
      if ((r.AvgClickPosition ?? -1) > 0 && clicks > 0) {
        g.posClickW += (r.AvgClickPosition as number) * clicks;
        g.clickPosN += clicks;
      }
      groups.set(key, g);
    }
    out = [...groups.entries()].map(([key, g]) => {
      totalImpr += g.impr;
      totalClicks += g.clicks;
      return {
        [keyField.toLowerCase()]: key,
        clicks: g.clicks,
        impressions: g.impr,
        ctr: g.impr ? round((g.clicks / g.impr) * 100) : 0,
        position: g.impr && g.posImprW ? round(g.posImprW / g.impr, 1) : null,
        ...(g.clickPosN ? { avgClickPosition: round(g.posClickW / g.clickPosN, 1) } : {}),
        weeksWithData: g.weeks,
      };
    });
  } else {
    out = filtered.map((r) => {
      const impr = r.Impressions ?? 0;
      const clicks = r.Clicks ?? 0;
      totalImpr += impr;
      totalClicks += clicks;
      return {
        date: r.Date,
        [keyField.toLowerCase()]: r[keyField],
        clicks,
        impressions: impr,
        ctr: impr ? round((clicks / impr) * 100) : 0,
        position: (r.AvgImpressionPosition ?? -1) > 0 ? (r.AvgImpressionPosition as number) : null,
        ...((r.AvgClickPosition ?? -1) > 0 ? { avgClickPosition: r.AvgClickPosition as number } : {}),
      };
    });
  }

  out.sort((a, b) => {
    if (sortBy === "position") return (a.position ?? Infinity) - (b.position ?? Infinity);
    return (b[sortBy] as number) - (a[sortBy] as number) || b.impressions - a.impressions;
  });

  return {
    period: { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null },
    granularity: "weekly (Bing reports performance data per week)",
    totals: {
      clicks: totalClicks,
      impressions: totalImpr,
      ctr: totalImpr ? round((totalClicks / totalImpr) * 100) : 0,
    },
    totalRows: out.length,
    returned: Math.min(limit, out.length),
    rows: out.slice(0, limit),
  };
}

export function filterSeries<T extends { Date?: string }>(rows: T[], startDate?: string, endDate?: string): T[] {
  return (rows ?? []).filter((r) => inRange(r.Date, startDate, endDate)).sort((a, b) => String(a.Date).localeCompare(String(b.Date)));
}
