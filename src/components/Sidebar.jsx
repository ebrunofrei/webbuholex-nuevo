// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import buhoLogo from "../assets/buho-institucional.png";
import { useAuth } from "@/context/AuthContext.jsx";
import { fetchAgendaAlertas } from "@/services/agendaService.js";
import UserProfileCard from "@/oficinaVirtual/components/UserProfileCard.jsx";

const MENU = [
  { label: "Oficina", icon: "🏛️", to: "/oficinaVirtual" },
  {
    label: "LitisBot PRO",
    icon: <img src="/icons/icon-192.png" alt="" className="w-4 h-4" />,
    to: "/oficinaVirtual/chat-pro",
  },
  { label: "Biblioteca", icon: "📚", to: "/oficinaVirtual/biblioteca" },
  { label: "Agenda", icon: "🗓️", to: "/oficinaVirtual/agenda" },
  { label: "Firmar Escrito PDF", icon: "✍️", to: "/oficinaVirtual/firmar-escrito" },
  { label: "Noticias", icon: "📢", to: "/oficinaVirtual/noticias" },
  { label: "Hazte conocido", icon: "🌟", to: "/oficinaVirtual/hazte-conocido" },
  { label: "Calculadora Laboral", icon: "🧮", to: "/oficinaVirtual/calculadora-laboral" },
  { label: "Mi Perfil", icon: "👤", to: "/oficinaVirtual/perfil" },
];

const TZ = "America/Lima";

// ------------------------------
// Helpers UI
// ------------------------------
function fmtWhen(ev) {
  const day = ev?.dueLocalDay || (ev?.endISO ? String(ev.endISO).slice(0, 10) : "");
  const time = ev?.endISO ? String(ev.endISO).slice(11, 16) : "";
  return day ? `${day}${time ? " · " + time : ""}` : "—";
}

function Section({ title, tone = "neutral", items = [], emptyText = "" }) {
  const headerStyle =
    tone === "critical"
      ? { color: "#b03a1a" }
      : tone === "upcoming"
      ? { color: "#5C2E0B" }
      : { color: "#333" };

  const cardStyle =
    tone === "critical"
      ? { borderColor: "#f1c0b0", background: "#fff6f4" }
      : tone === "upcoming"
      ? { borderColor: "rgba(92,46,11,0.22)", background: "#fffdfb" }
      : { borderColor: "#eee", background: "#fff" };

  return (
    <div className="mb-3">
      <div className="text-xs font-bold uppercase tracking-wide mb-2" style={headerStyle}>
        {title}
      </div>

      {!items.length ? (
        <div className="text-sm text-gray-600">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((ev) => (
            <div
              key={String(ev?._id || ev?.id || ev?.endUnix || ev?.endISO || ev?.title || "")}
              className="p-2 rounded-lg border"
              style={cardStyle}
            >
              <div className="text-sm font-semibold" style={{ color: "#5C2E0B" }}>
                {ev?.title || "Evento"}
              </div>
              <div className="text-xs text-gray-600">{fmtWhen(ev)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsPopover({ open, anchorRef, criticalItems, upcomingItems, onClose }) {
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function onDown(e) {
      const a = anchorRef?.current;
      const p = popRef?.current;
      if (!a || !p) return;
      if (a.contains(e.target) || p.contains(e.target)) return;
      onClose?.();
    }

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={popRef}
      className="absolute right-3 top-[42px] w-[280px] md:w-[320px] bg-white border shadow-xl rounded-xl overflow-hidden z-50"
      style={{ borderColor: "#5C2E0B" }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: "#b03a1a", color: "#fff" }}
      >
        <div className="font-bold text-sm">Alertas de Agenda</div>
        <button
          onClick={onClose}
          className="text-white/90 hover:text-white text-lg leading-none"
          aria-label="Cerrar"
          title="Cerrar"
          type="button"
        >
          ×
        </button>
      </div>

      <div className="p-3">
        <Section
          title="⚠️ Críticos"
          tone="critical"
          items={criticalItems}
          emptyText="Sin críticos ahora. Buen día para respirar… o para litigar con calma."
        />
        <Section
          title="⏱️ Próximos"
          tone="upcoming"
          items={upcomingItems}
          emptyText="No hay próximos dentro del horizonte."
        />

        <Link
          to="/oficinaVirtual/agenda"
          className="block text-center text-sm font-semibold px-3 py-2 rounded-lg mt-2"
          style={{ background: "#5C2E0B", color: "#fff" }}
          onClick={onClose}
        >
          Ver agenda completa →
        </Link>
      </div>
    </div>
  );
}

function AgendaBadge({ count, onClick, anchorRef }) {
  if (!count || count <= 0) return null;
  return (
    <button
      ref={anchorRef}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className="ml-auto text-xs font-bold px-2 py-1 rounded-full"
      style={{ background: "#b03a1a", color: "#ffffff" }}
      title={`${count} plazos críticos en alerta`}
    >
      ⚠️ {count}
    </button>
  );
}

// ------------------------------
// Sidebar
// ------------------------------
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const usuarioId = useMemo(() => user?.uid || "", [user]);

  const [agendaCriticalCount, setAgendaCriticalCount] = useState(0);
  const [agendaUpcomingCount, setAgendaUpcomingCount] = useState(0);
  const [criticalItems, setCriticalItems] = useState([]);
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const badgeAnchorRef = useRef(null);

  const aliveRef = useRef(true);
  const timerRef = useRef(null);
  const backoffRef = useRef(0); // 0..5
  const lastUsuarioRef = useRef("");

  // Abort para matar requests colgados al cambiar de usuario / unmount
  const abortRef = useRef(null);

  const resetAgendaState = useCallback(() => {
    setAgendaCriticalCount(0);
    setAgendaUpcomingCount(0);
    setCriticalItems([]);
    setUpcomingItems([]);
    setShowAlerts(false);
    backoffRef.current = 0;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const scheduleNext = useCallback(
    (fn, ms) => {
      clearTimer();
      timerRef.current = setTimeout(fn, ms);
    },
    [clearTimer]
  );

  const abortInFlight = useCallback(() => {
    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = null;
  }, []);

  const loadAgendaAlertas = useCallback(async () => {
    if (!aliveRef.current) return;

    if (!usuarioId) {
      resetAgendaState();
      return;
    }

    // Pausa elegante si la pestaña no está visible
    if (document.visibilityState === "hidden") {
      scheduleNext(loadAgendaAlertas, 60_000);
      return;
    }

    // Cancela cualquier request anterior y crea uno nuevo
    abortInFlight();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const data = await fetchAgendaAlertas({
        usuarioId,
        tz: TZ,
        horizonMinutes: 1440,
        includeUpcoming: true,
        limit: 50,
        timeoutMs: 12_000,
        retries: 2,
        signal: ctrl.signal,
      });

      if (!aliveRef.current) return;

      const critical = Array.isArray(data?.critical) ? data.critical : [];
      const upcoming = Array.isArray(data?.upcoming) ? data.upcoming : [];

      setAgendaCriticalCount(Number(data?.counts?.critical ?? critical.length ?? 0));
      setAgendaUpcomingCount(Number(data?.counts?.upcoming ?? upcoming.length ?? 0));
      setCriticalItems(critical);
      setUpcomingItems(upcoming);

      backoffRef.current = 0;
      scheduleNext(loadAgendaAlertas, 60_000);
    } catch {
      if (!aliveRef.current) return;

      // Backoff progresivo (si backend/proxy se cae/reinicia)
      const step = Math.min(5, (backoffRef.current || 0) + 1);
      backoffRef.current = step;

      setAgendaCriticalCount(0);
      setAgendaUpcomingCount(0);
      setCriticalItems([]);
      setUpcomingItems([]);

      const nextMs = 60_000 + step * 30_000; // 60s, 90s, 120s...
      scheduleNext(loadAgendaAlertas, nextMs);
    }
  }, [usuarioId, resetAgendaState, scheduleNext, abortInFlight]);

  useEffect(() => {
    aliveRef.current = true;

    if (lastUsuarioRef.current !== usuarioId) {
      lastUsuarioRef.current = usuarioId;
      resetAgendaState();
    }

    loadAgendaAlertas();

    function onVis() {
      if (document.visibilityState === "visible") loadAgendaAlertas();
    }
    document.addEventListener("visibilitychange", onVis);

    return () => {
      aliveRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      abortInFlight();
      clearTimer();
    };
  }, [usuarioId, loadAgendaAlertas, resetAgendaState, abortInFlight, clearTimer]);

  // cambiar de ruta: cerrar popover + abort request (menos ruido)
  useEffect(() => {
    setShowAlerts(false);
    abortInFlight();
  }, [location.pathname, abortInFlight]);

  return (
    <>
      {!open && (
        <button
          className="fixed top-4 left-4 z-50 md:hidden bg-[#b03a1a] text-white p-2 rounded-full shadow"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          title="Menú"
          type="button"
        >
          ☰
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#fef6f2] border-r px-5 py-6 flex flex-col items-center z-50 transform transition-transform duration-300
        ${open ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"}
        md:static md:translate-x-0 md:pointer-events-auto`}
      >
        <img src={buhoLogo} alt="Logo" className="w-16 h-16 mb-2 rounded-xl" />
        <div className="font-bold text-[#b03a1a] text-lg mb-1">BúhoLex</div>
        <div className="text-xs text-gray-400 mb-4">Oficina Virtual</div>

        <nav className="flex-1 w-full overflow-y-auto relative">
          {MENU.map(({ label, icon, to }) => {
            const isActive = location.pathname === to;

            if (to === "/oficinaVirtual/agenda") {
              const tip =
                agendaCriticalCount > 0
                  ? `${agendaCriticalCount} críticos · ${agendaUpcomingCount} próximos`
                  : agendaUpcomingCount > 0
                  ? `${agendaUpcomingCount} próximos`
                  : "Agenda";

              return (
                <div key={to} className="relative">
                  <Link
                    to={to}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg mb-1 font-semibold transition ${
                      isActive
                        ? "bg-[#ffe5dc] text-[#b03a1a] shadow"
                        : "text-gray-700 hover:bg-[#fff7f3] hover:text-[#b03a1a]"
                    }`}
                    onClick={() => setOpen(false)}
                    title={tip}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="flex-1">{label}</span>

                    <AgendaBadge
                      anchorRef={badgeAnchorRef}
                      count={agendaCriticalCount}
                      onClick={() => setShowAlerts((v) => !v)}
                    />
                  </Link>

                  <AlertsPopover
                    open={showAlerts}
                    anchorRef={badgeAnchorRef}
                    criticalItems={criticalItems}
                    upcomingItems={upcomingItems}
                    onClose={() => setShowAlerts(false)}
                  />
                </div>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg mb-1 font-semibold transition ${
                  isActive
                    ? "bg-[#ffe5dc] text-[#b03a1a] shadow"
                    : "text-gray-700 hover:bg-[#fff7f3] hover:text-[#b03a1a]"
                }`}
                onClick={() => setOpen(false)}
              >
                <span className="text-xl">{icon}</span>
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="w-full mt-4 space-y-2">
          <UserProfileCard />
        </div>

        <button
          className="md:hidden absolute top-4 right-4 text-[#b03a1a] text-2xl"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          title="Cerrar"
          type="button"
        >
          ✖️
        </button>
      </aside>
    </>
  );
}
