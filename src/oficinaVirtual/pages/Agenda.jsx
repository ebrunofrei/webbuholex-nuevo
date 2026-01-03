// ============================================================
// 🗓️ Agenda Jurídica BúhoLex – v3.4 Enterprise (GLOBAL TZ)
// ------------------------------------------------------------
// - Fuente única: AgendaProfesional (Mongo/BúhoLex)
// - Zona horaria REAL del usuario (no hardcode)
// - Rango mensual determinista (YYYY-MM-DD)
// - onMonthChange sincroniza mes visible
// - Compatible LATAM / EU / GLOBAL
// ============================================================

import React, { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import AgendaProfesional from "../components/agendaprofesional/AgendaProfesional";

// ------------------------------------------------------------
// Helper: rango YYYY-MM-DD del mes visible
// ------------------------------------------------------------
function computeMonthRange(baseDate) {
  const d =
    baseDate instanceof Date && !Number.isNaN(baseDate.getTime())
      ? baseDate
      : new Date();

  const y = d.getFullYear();
  const m = d.getMonth();

  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);

  const toYMD = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
      x.getDate()
    ).padStart(2, "0")}`;

  return {
    from: toYMD(first),
    to: toYMD(last),
  };
}

// ============================================================
// Agenda (Vista principal)
// ============================================================
export default function Agenda({ expedienteId = null }) {
  const { user } = useAuth();

  // ----------------------------------------------------------
  // Identidad del usuario
  // ----------------------------------------------------------
  const usuarioId = user?.uid || null;

  // ----------------------------------------------------------
  // 🌍 Zona horaria GLOBAL (orden de prioridad)
  // 1) user.timezone (si existe)
  // 2) navegador
  // 3) fallback UTC
  // ----------------------------------------------------------
  const tz =
    user?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  // ----------------------------------------------------------
  // Mes visible (controlado por AgendaProfesional)
  // ----------------------------------------------------------
  const [visibleDate, setVisibleDate] = useState(() => new Date());

  // ----------------------------------------------------------
  // Rango mensual determinista
  // ----------------------------------------------------------
  const { from, to } = useMemo(
    () => computeMonthRange(visibleDate),
    [visibleDate]
  );

  // ----------------------------------------------------------
  // Cambio de mes desde el calendario
  // ----------------------------------------------------------
  const handleMonthChange = useCallback((dateObj) => {
    if (dateObj instanceof Date && !Number.isNaN(dateObj.getTime())) {
      setVisibleDate(dateObj);
    }
  }, []);

  // ==========================================================
  // Render
  // ==========================================================
  return (
    <div className="flex flex-col md:flex-row gap-8 p-6">
      <div className="flex-1">
        {/* ------------------------------------------------------
            🟢 Agenda Profesional (Mongo / Enterprise)
            - TZ real del usuario
            - Rango mensual sincronizado
        ------------------------------------------------------- */}
        <AgendaProfesional
          usuarioId={usuarioId}
          expedienteId={expedienteId}
          tz={tz}
          from={from}
          to={to}
          onMonthChange={handleMonthChange}
        />

        {!usuarioId && (
          <div className="mt-3 text-sm text-red-600">
            Inicia sesión para ver tu agenda.
          </div>
        )}
      </div>
    </div>
  );
}
