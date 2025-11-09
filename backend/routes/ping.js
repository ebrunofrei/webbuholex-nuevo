// backend/routes/ping.js
import { Router } from 'express';

const router = Router();

router.get('/ping', (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/json');

    const now = new Date();
    return res.status(200).json({
      ok: true,
      status: 'alive',
      now: Date.now(),
      iso: now.toISOString(),
      env: process.env.NODE_ENV ?? 'unknown',
      uptime: `${Math.floor(process.uptime())}s`,
      commit: process.env.GITHUB_SHA ?? undefined,
      version: process.env.BUILD_VERSION ?? undefined,
    });
  } catch (error) {
    console.error('❌ Error en /api/ping:', error);
    return res.status(500).json({ ok: false, status: 'error', error: String(error?.message ?? error) });
  }
});

// HEAD rápido sin cuerpo
router.head('/ping', (_req, res) => res.sendStatus(204));

export default router;
