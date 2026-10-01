// Fake Bing Webmaster API used by the end-to-end test. Accepts only TEST_KEY.
import http from "node:http";

export const TEST_KEY = "TESTKEY1234567890ABCDEF";

const d = (iso) => `/Date(${Date.parse(iso + "T07:00:00Z")}-0700)/`;
const T = (t) => ({ __type: `${t}:#Microsoft.Bing.Webmaster.Api` });
const q = (Query, date, Impressions, Clicks, AvgImpressionPosition, AvgClickPosition) => ({
  ...T("QueryStats"), Query, Date: d(date), Impressions, Clicks, AvgImpressionPosition, AvgClickPosition,
});

const DATA = {
  GetUserSites: [{ ...T("Site"), Url: "https://example.com/", IsVerified: true, AuthenticationCode: "SECRET", DnsVerificationCode: "SECRET.example.com" }],
  GetQueryStats: [
    q("seo valencia", "2026-08-01", 100, 10, 4, 3),
    q("seo valencia", "2026-08-08", 300, 30, 6, 5),
    q("consultor seo", "2026-08-01", 500, 5, 12, -1),
    q("geo ia", "2026-09-05", 50, 8, 2, 2),
  ],
  GetRankAndTrafficStats: [
    { ...T("RankAndTrafficStats"), Date: d("2026-08-01"), Clicks: 20, Impressions: 700 },
    { ...T("RankAndTrafficStats"), Date: d("2026-07-01"), Clicks: 9, Impressions: 300 },
  ],
  GetUrlLinks: { ...T("LinkDetails"), Details: [{ ...T("LinkDetail"), AnchorText: "link", Url: "http://ref.com/a" }], TotalPages: 3 },
};

export function startMockBing(port) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const method = u.pathname.split("/").pop();
    res.setHeader("Content-Type", "application/json");
    if (u.searchParams.get("apikey") !== TEST_KEY) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ErrorCode: 3, Message: "InvalidApiKey" }));
    }
    if (!(method in DATA)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ErrorCode: 13, Message: "NotFound" }));
    }
    res.end(JSON.stringify({ d: DATA[method] }));
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
