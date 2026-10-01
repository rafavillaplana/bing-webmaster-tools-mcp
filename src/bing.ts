/**
 * Minimal client for the Bing Webmaster Tools JSON API.
 * Docs: https://learn.microsoft.com/en-us/bingwebmaster/
 */

export const DEFAULT_BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

export class BingApiError extends Error {
  status: number;
  errorCode?: number | string;

  constructor(message: string, status: number, errorCode?: number | string) {
    super(message);
    this.name = "BingApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

type Params = Record<string, string | number | undefined>;

export class BingWebmasterClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = DEFAULT_BING_API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async get<T = unknown>(method: string, params: Params = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${method}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    url.searchParams.set("apikey", this.apiKey);

    const res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
    const text = await res.text();
    let body: any;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const msg = body?.Message ?? body?.message ?? (text.slice(0, 300) || res.statusText);
      throw new BingApiError(`Bing API ${method} → HTTP ${res.status}: ${msg}`, res.status, body?.ErrorCode);
    }
    if (body && typeof body === "object" && "ErrorCode" in body && body.ErrorCode) {
      throw new BingApiError(`Bing API ${method}: ${body.Message ?? body.ErrorCode}`, res.status, body.ErrorCode);
    }
    return normalize(body?.d ?? body) as T;
  }
}

/** Converts a .NET JSON date ("/Date(1316156400000-0700)/") to an ISO day ("2011-09-16"). */
export function parseNetDate(value: string): string | null {
  const m = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Formats an ISO date (YYYY-MM-DD) the way the API expects it in a query string. */
export function toNetDate(iso: string): string {
  const ms = Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(ms)) throw new Error(`Invalid date: ${iso} (use YYYY-MM-DD)`);
  return `/Date(${ms})/`;
}

/** Recursively drops "__type" fields and converts .NET dates to ISO days. */
export function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "__type") continue;
      out[k] = normalize(v);
    }
    return out;
  }
  if (typeof value === "string" && value.startsWith("/Date(")) {
    return parseNetDate(value) ?? value;
  }
  return value;
}
