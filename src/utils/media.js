import { getApiBase } from "@/services/newsApi";

// Si la fuente bloquea “hotlinking” (403), pasamos por proxy: /api/media?u=
export function imgViaProxy(src) {
  if (!src) return "/assets/default-news.jpg";
  if (/^\/(assets|uploads)\//.test(src)) return src;
  if (/^https?:\/\//i.test(src)) {
    const base = getApiBase();
    const qs = new URLSearchParams({ u: src });
    return `${base}/media?${qs.toString()}`;
  }
  return "/assets/default-news.jpg";
}
