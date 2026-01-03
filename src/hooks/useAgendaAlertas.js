// ============================================================
// 🦉 useAgendaAlertas – BúhoLex Enterprise (v3.1)
// ------------------------------------------------------------
// - Polling inteligente (cada 60s)
// - Manejo de errores limpio
// - Datos derivados listos para UI (badges, riesgo, prox. activación)
// - Compatibilidad con backend nuevo (counts + arrays planos)
// ============================================================

import { useEffect, useMemo, useState, useRef } from "react";
import { fetchAgendaAlertas } from "@/services/agendaService";

export function useAgendaAlertas({
  usuarioId,
  tz = "America/Lima",
  token = null,
  pollInterval = 60_000,      // 1 min – producción
  horizonMinutes = 1440,      // 24 horas
  limit = 20,                 // ﬁltra UI
} = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const alive = useRef(true);
  const timer = useRef(null);

  // ------------------------------------------------------------
  // Carga principal
  // ------------------------------------------------------------
  async function load() {
    if (!usuarioId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchAgendaAlertas({
        usuarioId,
        tz,
        token,
        horizonMinutes,
        includeUpcoming: true,
        limit,
      });

      if (alive.current) {
        setData(res);
      }
    } catch (err) {
      if (alive.current) {
        console.warn("⚠️ useAgendaAlertas ERROR", err);
        setError(err);
        setData(null);
      }
    } finally {
      if (alive.current) {
        setLoading(false);
      }
    }
  }

  // ------------------------------------------------------------
  // Polling (intervalo fijo)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!usuarioId) return;

    alive.current = true;
    load();

    timer.current = setInterval(load, pollInterval);

    return () => {
      alive.current = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [usuarioId, tz, token, pollInterval, horizonMinutes]);

  // ------------------------------------------------------------
  // Datos derivados para UI
  // ------------------------------------------------------------
  const derived = useMemo(() => {
    if (!data || !data.ok) {
      return {
        critical: [],
        upcoming: [],
        criticalCount: 0,
        upcomingCount: 0,
        nextTriggerUnix: null,
        badge: 0,
      };
    }

    const { critical = [], upcoming = [] } = data;

    const criticalCount = critical.length;
    const upcomingCount = upcoming.length;

    // Badge unificado
    const badge = criticalCount + upcomingCount;

    // Determinar próximo deadline (para quemar notificación futura)
    const all = [...critical, ...upcoming];
    const nextTriggerUnix = all.length
      ? Math.min(...all.map((ev) => ev.endUnix ?? Infinity))
      : null;

    return {
      critical,
      upcoming,
      criticalCount,
      upcomingCount,
      nextTriggerUnix,
      badge,
    };
  }, [data]);

  return {
    loading,
    error,
    meta: data,
    ...derived, // los campos calculados
  };
}
