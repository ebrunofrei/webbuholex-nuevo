const IS_BROWSER = typeof window !== "undefined";

export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function loadAnalysisCount(key) {
  if (!IS_BROWSER) return { date: getTodayKey(), count: 0 };

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { date: getTodayKey(), count: 0 };

    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: getTodayKey(), count: 0 };
  }
}

export function saveAnalysisCount(key, data) {
  if (!IS_BROWSER) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function loadChatSession(key) {
  if (!IS_BROWSER) return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveChatSession(key, messages) {
  if (!IS_BROWSER) return;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify(Array.isArray(messages) ? messages.slice(-50) : [])
    );
  } catch {}
}
