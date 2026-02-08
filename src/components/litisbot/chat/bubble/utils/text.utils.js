export function sanitizeHtml(html = "") {
  if (typeof document === "undefined") {
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .trim();
  }

  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("script,style,noscript").forEach(el => el.remove());
  return tmp.innerHTML;
}

export function toPlain(html = "") {
  if (typeof document === "undefined") return String(html);
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function stripMarkdownSyntax(text = "") {
  let t = text.replace(/\r\n/g, "\n");
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  t = t.replace(/```([\s\S]*?)```/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}
