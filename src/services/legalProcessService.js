const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

const API_BASE = String(RAW_BASE || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, ""); // ← elimina /api final si existe

function buildUrl(path) {
  let p = String(path || "");
  if (!p.startsWith("/")) p = "/" + p;
  return API_BASE + p;
}

export async function processLegalText(text, options = {}) {
  const res = await fetch(buildUrl("/api/legal/process"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, options }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || "legal_process_failed" };
  }

  return { ok: true, result: data.result };
}