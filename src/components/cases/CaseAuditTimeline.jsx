// ======================================================================
// 🦉 CaseAuditTimeline — Timeline jurídico auditado (UX-6.5 / C.3.4 READY)
// ----------------------------------------------------------------------
// - Visualiza eventos auditados
// - No ejecuta acciones
// - Emite INTENCIONES (rollback, análisis)
// ======================================================================

import React, { useEffect, useState, useMemo } from "react";
import { riskColors } from "./auditColors.js";
import { eventIcons } from "./auditIcons.js";

/* ======================================================================
   NORMALIZADOR (desacopla UI del backend)
====================================================================== */
function normalizeEvent(e = {}) {
  const integrity =
    e.integrity ||
    (e.hash && e.prevHash ? "valid" : e.hash ? "unverified" : "unverified");

  return {
    id: e.id || e._id,
    at: e.at || e.createdAt || null,
    type: e.type || "evento_general",
    role: e.role || null,
    content: e.content || e.result?.summary || "",

    meta: e.meta || {},
    intent: e.meta?.intent || null,
    phase: e.meta?.phase || null,
    cognitiveVersion: e.meta?.cognitiveVersion || null,

    actor: e.actor || null,

    confirmation: e.confirmation || null,
    result: e.result || null,

    flags: Array.isArray(e.flags) ? e.flags : [],
    risk: e.riesgo || "bajo",

    hash: e.hash || null,
    prevHash: e.prevHash || null,
    integrity,

    riskLevel:
      integrity === "broken"
        ? "critical"
        : integrity === "unverified"
        ? "warning"
        : "ok",
  };
}

/* ======================================================================
   COMPONENTE
====================================================================== */
export default function CaseAuditTimeline({
  caseId,
  onAction, // 🔑 C.3.4 — emite acciones al ChatWindow
}) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ============================================================
     CARGA DE EVENTOS AUDITADOS
  ============================================================ */
  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/cases/${caseId}/audit`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Error al cargar auditoría");
        }

        if (alive) {
          const raw = Array.isArray(data.timeline) ? data.timeline : [];
          setTimeline(raw.map(normalizeEvent));
        }
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [caseId]);

  /* ============================================================
     ESTADOS BASE
  ============================================================ */
  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Cargando auditoría…</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-600">{error}</div>;
  }

  if (timeline.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No hay eventos auditables aún.
      </div>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="p-4 space-y-4">
      {timeline.map((event) => {
        const Icon = eventIcons[event.type] || eventIcons.evento_general;
        const color = riskColors[event.risk] || "bg-gray-100 text-gray-800";

        const fecha = useMemo(() => {
          if (!event.at) return "—";
          try {
            return new Date(event.at).toLocaleString("es-PE", {
              dateStyle: "medium",
              timeStyle: "short",
            });
          } catch {
            return "—";
          }
        }, [event.at]);

        return (
          <div
            key={event.id}
            className="flex items-start gap-3 border rounded-xl p-3 bg-white"
          >
            {/* ICONO */}
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon size={18} />
            </div>

            {/* CONTENIDO */}
            <div className="flex-1">
              <div className="text-xs text-gray-500">
                {fecha}
                {event.role === "assistant" && (
                  <span className="ml-2 italic text-gray-400">· LitisBot</span>
                )}
              </div>

              {event.content && (
                <div className="text-sm text-gray-800 mt-1">
                  {event.content}
                </div>
              )}

              {/* 🧠 CONTEXTO COGNITIVO */}
              {(event.intent || event.phase) && (
                <div className="mt-1 text-xs text-gray-500 italic">
                  🧠 {event.intent || "—"}
                  {event.phase && ` · fase: ${event.phase}`}
                  {event.cognitiveVersion && ` · v${event.cognitiveVersion}`}
                </div>
              )}

              {event.confirmation && (
                <div className="text-xs text-green-700 mt-1">
                  ✔ Evento confirmado
                </div>
              )}

              {event.result?.summary && (
                <div className="text-xs text-gray-600 mt-1 italic">
                  {event.result.summary}
                </div>
              )}

              {/* 🔐 INTEGRIDAD */}
              <div className="mt-1 text-xs">
                {event.integrity === "valid" && (
                  <span className="text-green-700">🔒 Integridad verificada</span>
                )}
                {event.integrity === "unverified" && (
                  <span className="text-gray-500 italic">
                    ⏳ Sin verificación criptográfica
                  </span>
                )}
                {event.integrity === "broken" && (
                  <span className="text-red-700">
                    ❌ Integridad comprometida
                  </span>
                )}
              </div>

              {/* 🚦 RIESGO */}
              <div className="mt-1 text-xs font-medium">
                {event.riskLevel === "ok" && (
                  <span className="text-green-700">🟢 Riesgo bajo</span>
                )}
                {event.riskLevel === "warning" && (
                  <span className="text-yellow-700">🟡 Riesgo medio</span>
                )}
                {event.riskLevel === "critical" && (
                  <span className="text-red-700">🔴 Riesgo alto</span>
                )}
              </div>

              {/* ===============================
                 C.3.4 — ACCIÓN ROLLBACK
              =============================== */}
              <button
                onClick={() =>
                  onAction?.({
                    type: "ROLLBACK_EVENT",
                    label: "Revertir a este punto",
                    payload: { eventId: event.id },
                  })
                }
                className="
                  mt-3 text-xs
                  px-3 py-1
                  rounded-md
                  border border-red-300
                  text-red-700
                  hover:bg-red-50
                "
              >
                Revertir a este momento
              </button>

              {/* FLAGS */}
              {event.flags.length > 0 && (
                <div className="mt-2 space-y-1">
                  {event.flags.map((f, i) => (
                    <div
                      key={i}
                      className="
                        text-xs text-red-700
                        bg-red-50
                        border border-red-200
                        rounded px-2 py-1
                      "
                    >
                      ⚠️ {f.message || f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
