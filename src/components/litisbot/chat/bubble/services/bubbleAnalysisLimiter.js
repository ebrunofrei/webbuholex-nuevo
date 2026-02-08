// src/components/litisbot/chat/bubble/services/bubbleAnalysisLimiter.js

const STORAGE_KEY = "litis:bubbleAnalysisCount:v1";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function loadBubbleAnalysisState() {
  if (typeof window === "undefined") {
    return { date: todayKey(), count: 0 };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), count: 0 };

    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), count: 0 };
    }

    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

export function incrementBubbleAnalysisCount(prev) {
  const next = {
    date: todayKey(),
    count: (prev?.count || 0) + 1,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  return next;
}
