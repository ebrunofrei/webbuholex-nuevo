// src/core/api/httpClient.js
import { env } from "../config/env";

const TIMEOUT_MS = 45_000;

const isHTML = (t) => /^<!doctype html>|<html/i.test(String(t || ""));

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error("Request timeout.")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class HttpError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status ?? 0;
    this.code = code ?? null;
    this.details = details ?? null;
  }
}

export async function httpRequest(path, options = {}) {
  const base = env.API_BASE_URL || "";
  const url = `${base}${path}`;

  const {
    method = "GET",
    headers = {},
    body,
    retry = 0,
    timeoutMs = TIMEOUT_MS,
    credentials = "omit",
  } = options;

  const reqInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
    cache: "no-store",
    credentials,
  };

  const started = performance.now();

  let res;
  try {
    res = await withTimeout(fetch(url, reqInit), timeoutMs);
  } catch (e) {
    throw new HttpError("Network error.", { status: 0, code: "NETWORK_FAIL", details: String(e?.message || e) });
  }

  // retry only on transient gateway
  if (retry > 0 && [502, 503, 504].includes(res.status)) {
    return httpRequest(path, { ...options, retry: retry - 1 });
  }

  const ct = res.headers.get("content-type") || "";
  const latencyMs = Math.round(performance.now() - started);

  // If not JSON => read text and block HTML
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    if (isHTML(text)) {
      throw new HttpError("Invalid server response (HTML).", {
        status: res.status,
        code: "HTML_RESPONSE",
        details: { latencyMs },
      });
    }
    throw new HttpError(text || "Invalid server response.", {
      status: res.status,
      code: "NON_JSON_RESPONSE",
      details: { latencyMs },
    });
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      `HTTP ${res.status}`;

    throw new HttpError(msg, {
      status: res.status,
      code: data?.code || `HTTP_${res.status}`,
      details: { latencyMs, data },
    });
  }

  return { data, latencyMs, status: res.status };
}
