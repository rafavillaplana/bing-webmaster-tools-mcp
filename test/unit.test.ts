import { test } from "node:test";
import assert from "node:assert/strict";
import { filterSeries, summarizeStats, type StatRow } from "../src/stats.ts";
import { normalize, parseNetDate, toNetDate } from "../src/bing.ts";

const rows: StatRow[] = [
  { Query: "seo valencia", Date: "2026-08-01", Impressions: 100, Clicks: 10, AvgImpressionPosition: 4, AvgClickPosition: 3 },
  { Query: "seo valencia", Date: "2026-08-08", Impressions: 300, Clicks: 30, AvgImpressionPosition: 6, AvgClickPosition: 5 },
  { Query: "consultor seo", Date: "2026-08-01", Impressions: 500, Clicks: 5, AvgImpressionPosition: 12, AvgClickPosition: -1 },
  { Query: "geo ia", Date: "2026-09-05", Impressions: 50, Clicks: 8, AvgImpressionPosition: 2, AvgClickPosition: 2 },
];

test("aggregates per key with weighted positions", () => {
  const r = summarizeStats(rows, { keyField: "Query" });
  assert.deepEqual(r.totals, { clicks: 53, impressions: 950, ctr: 5.58 });
  assert.deepEqual(r.period, { from: "2026-08-01", to: "2026-09-05" });
  const top = r.rows[0];
  assert.equal(top.query, "seo valencia");
  assert.equal(top.position, 5.5); // (4*100 + 6*300) / 400
  assert.equal(top.avgClickPosition, 4.5); // (3*10 + 5*30) / 40
  assert.equal("avgClickPosition" in r.rows.find((x) => x.query === "consultor seo")!, false); // omitted when Bing sends -1
});

test("filters by date range and text, sorts and limits", () => {
  const r = summarizeStats(rows, { keyField: "Query", startDate: "2026-08-05", contains: "SEO" });
  assert.equal(r.totalRows, 1);
  assert.equal(r.rows[0].clicks, 30);

  const byImpr = summarizeStats(rows, { keyField: "Query", sortBy: "impressions", limit: 1 });
  assert.equal(byImpr.returned, 1);
  assert.equal(byImpr.rows[0].query, "consultor seo");

  const byPos = summarizeStats(rows, { keyField: "Query", sortBy: "position" });
  assert.equal(byPos.rows[0].query, "geo ia");
});

test("weekly mode keeps one row per week", () => {
  const r = summarizeStats(rows, { keyField: "Query", aggregate: false });
  assert.equal(r.totalRows, 4);
  assert.ok(r.rows.every((x) => typeof x.date === "string"));
});

test("handles empty and missing input", () => {
  const r = summarizeStats(null as unknown as StatRow[], { keyField: "Query" });
  assert.equal(r.totalRows, 0);
  assert.deepEqual(r.totals, { clicks: 0, impressions: 0, ctr: 0 });
});

test("filterSeries sorts and filters by date", () => {
  const s = filterSeries([{ Date: "2026-08-01" }, { Date: "2026-07-01" }, { Date: "2026-09-01" }], "2026-07-15");
  assert.deepEqual(s.map((x) => x.Date), ["2026-08-01", "2026-09-01"]);
});

test(".NET date helpers", () => {
  assert.equal(parseNetDate("/Date(1316156400000-0700)/"), "2011-09-16");
  assert.equal(parseNetDate("not a date"), null);
  assert.equal(toNetDate("2026-01-01"), "/Date(1767225600000)/");
  assert.throws(() => toNetDate("yesterday"));
});

test("normalize strips __type and converts dates recursively", () => {
  const out = normalize({
    __type: "LinkDetails:#Microsoft.Bing.Webmaster.Api",
    Details: [{ __type: "LinkDetail", Url: "https://a.com", When: "/Date(1316156400000-0700)/" }],
    TotalPages: 3,
  });
  assert.deepEqual(out, { Details: [{ Url: "https://a.com", When: "2011-09-16" }], TotalPages: 3 });
});
