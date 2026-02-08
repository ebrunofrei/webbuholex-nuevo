// ============================================================
// 🗓️ Agenda Jurídica BúhoLex – v4.0 (AGENDA LIBRE – JSX)
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
// Agenda (Vista principal – LIBRE)
// ============================================================
export default function Agenda() {
  const { user } = useAuth();

  const usuarioId = user?.uid ?? null;

  const tz =
    user?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC";

  const [visibleDate, setVisibleDate] = useState(() => new Date());

  const { from, to } = useMemo(
    () => computeMonthRange(visibleDate),
    [visibleDate]
  );

  const handleMonthChange = useCallback((dateObj) => {
    if (dateObj instanceof Date && !Number.isNaN(dateObj.getTime())) {
      setVisibleDate(dateObj);
    }
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6">
      <div className="flex-1">
        <AgendaProfesional
          usuarioId={usuarioId}
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
