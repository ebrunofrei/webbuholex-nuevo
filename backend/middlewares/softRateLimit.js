const buckets = new Map(); // key -> { count, resetAt }

export function softRateLimit({ perMinute = 30 }) {
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const b = buckets.get(key) || { count: 0, resetAt: now + 60000 };

    if (now > b.resetAt) {
      b.count = 0;
      b.resetAt = now + 60000;
    }

    b.count++;
    buckets.set(key, b);

    // señal silenciosa al handler
    res.locals._softLimited = b.count > perMinute;
    next();
  };
}
