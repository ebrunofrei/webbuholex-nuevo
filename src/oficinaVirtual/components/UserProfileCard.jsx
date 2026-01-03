// src/oficinaVirtual/components/UserProfileCard.jsx
import React, { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

function buildInitials(nombre = "") {
  const parts = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const ini = parts.map((p) => p[0].toUpperCase()).join("");
  return ini || "I";
}

export default function UserProfileCard({
  onConfigurarIA,
  onOpenActions, // ✅ avatar click => popover acciones (Nuevo chat / Crear caso / Centro de control)
  className = "",
}) {
  const { user, isPremium, cerrarSesion } = useAuth() || {};
  const navigate = useNavigate();

  const nombre = user?.displayName || user?.nombre || "Invitado";
  const email = user?.email || "Sesión invitado";

  const iniciales = useMemo(() => buildInitials(nombre), [nombre]);

  const planLabel = isPremium ? "PLAN PRO" : "PLAN GRATIS";
  const planClass = isPremium
    ? "bg-[#e9dcc3] text-[#4b2e19]"
    : "bg-[#fde7e7] text-[#b03a1a]";

  return (
    <div
      className={[
        "mt-4 w-full rounded-2xl bg-white border border-[#f4e6c7] shadow-sm px-4 py-3 flex flex-col gap-2",
        className,
      ].join(" ")}
    >
      {/* Cabecera: avatar + nombre */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenActions}
          disabled={typeof onOpenActions !== "function"}
          className={[
            "w-10 h-10 rounded-full bg-[#fbe4d2] flex items-center justify-center font-bold text-[#b03a1a]",
            typeof onOpenActions === "function"
              ? "hover:brightness-[0.98] cursor-pointer"
              : "cursor-default",
          ].join(" ")}
          title={typeof onOpenActions === "function" ? "Acciones" : undefined}
          aria-label={typeof onOpenActions === "function" ? "Abrir acciones" : undefined}
        >
          {iniciales}
        </button>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-[#4b2e19] truncate">
            {nombre}
          </span>
          <span className="text-xs text-[#8b5a36] truncate">{email}</span>
        </div>
      </div>

      {/* Plan + enlace a Mi Cuenta */}
      <div className="flex items-center justify-between mt-1">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${planClass}`}
        >
          {planLabel}
        </span>

        <button
          type="button"
          onClick={() => navigate("/oficinaVirtual/perfil")}
          className="text-[11px] text-[#b03a1a] underline font-semibold"
        >
          Mi perfil
        </button>
      </div>

      {/* Botón Centro de control (mantiene el UX “bueno” que ya tienes) */}
      {typeof onConfigurarIA === "function" && (
        <button
          type="button"
          onClick={() => navigate("/oficinaVirtual/centro-de-control")}
          className="mt-2 w-full text-xs font-semibold rounded-xl border border-[#b03a1a]/70 px-3 py-1.5 text-[#b03a1a] hover:bg-[#fff5ef] transition"
        >
          Configurar IA · LitisBot
        </button>
      )}

      {/* Acciones extra: ir al Home + cerrar sesión */}
      <div className="mt-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full text-[11px] rounded-xl bg-white border border-[#b03a1a]/40 text-[#b03a1a] py-1.5 hover:bg-[#fff5ef] transition"
        >
          Ir al Home público
        </button>

        {!!user && (
          <button
            type="button"
            onClick={async () => {
              try {
                await cerrarSesion?.();
                navigate("/");
              } catch (e) {
                console.error("Error al cerrar sesión:", e);
              }
            }}
            className="w-full text-[11px] rounded-xl bg-[#fef1f0] text-[#b03a1a] py-1.5 hover:bg-[#fde0dd] transition"
          >
            Cerrar sesión
          </button>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-[#a07a4a]">
        Configura tu LitisBot, gestiona tu plan y controla tu oficina desde este
        perfil. Pronto: foto, firma y más.
      </p>
    </div>
  );
}
