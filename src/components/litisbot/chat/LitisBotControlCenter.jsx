// ============================================================================
// 🦉 LitisBotControlCenter – Cognitive Control (Enterprise)
// ----------------------------------------------------------------------------
// HARDWARE COGNITIVO (UI)
// - Edita estado cognitivo
// - NO razona
// - NO persiste
// - NO conoce IA
// ============================================================================

import React from "react";
import {
  useLitisCognitive,
  LITIS_MODE,
  LITIS_ROLES,
} from "@/components/litisbot/context/LitisBotCognitiveContext.jsx";

/* ---------------------------------------------------------------------------
   Labels UI (UI ≠ dominio ≠ backend)
--------------------------------------------------------------------------- */
const MODE_LABELS = {
  [LITIS_MODE.LITIGANTE]: "Litigante",
  [LITIS_MODE.ACADEMICO]: "Académico",
  [LITIS_MODE.INVESTIGADOR]: "Investigador",
  [LITIS_MODE.CONSULTIVO]: "Consultivo",
};

const ROLE_LABELS = {
  [LITIS_ROLES.JURISTA_INTEGRAL]: "Jurista integral",
  [LITIS_ROLES.LOGICO_JURIDICO]: "Lógico jurídico",
  [LITIS_ROLES.PERITO]: "Perito",
  [LITIS_ROLES.AUDITOR]: "Auditor",
  [LITIS_ROLES.FILOSOFO]: "Filósofo",
  [LITIS_ROLES.CATEDRATICO]: "Catedrático",
};

/* ===========================================================================
   COMPONENTE PRINCIPAL
=========================================================================== */

export default function LitisBotControlCenter({ open, onClose }) {
  const cognitive = useLitisCognitive();

  if (!open) return null;

  return (
    <Overlay onClose={onClose}>
      <Drawer>
      {/* =====================
          CONTENIDO SCROLLEABLE
        ===================== */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Header />

        <ModeSection
          value={cognitive.modoLitis}
          onChange={cognitive.setModoLitis}
        />

        <RoleSection
          value={cognitive.rolCognitivo}
          onChange={cognitive.setRolCognitivo}
        />

        <ProfileSection
          profile={cognitive.cognitiveProfile}
          onChange={cognitive.updateProfile}
        />
      </div>
      {/* =====================
          PLACEHOLDERS (HARDWARE FUTURO)
        ===================== */}
      <section className="opacity-50 space-y-2">
        <h3 className="text-sm font-medium">
          Memoria (próximamente)
        </h3>
        <p className="text-xs">
          Configuración de memoria cognitiva por sesión.
        </p>

        <h3 className="text-sm font-medium mt-4">
          Modo Audiencia (próximamente)
        </h3>
        <p className="text-xs">
          Optimización para audiencias y uso móvil.
        </p>
      </section>

      {/* =====================
          FOOTER STICKY
        ===================== */}
      <Footer
        onReset={cognitive.resetProfile}
        onClose={onClose}
      />
    </Drawer>
    </Overlay>
  );
}

/* ===========================================================================
   HARDWARE PURO (layout)
=========================================================================== */

function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

function Drawer({ children }) {
  return (
    <aside
      className="
        fixed right-0 top-0 h-full w-[380px]
        bg-white dark:bg-black
        border-l border-black/10 dark:border-white/10
        shadow-2xl
        flex flex-col
      "
    >
      {children}
    </aside>
  );
}

function Header() {
  return (
    <header className="mb-6">
      <h2 className="text-xl font-semibold">
        Centro de Control Cognitivo
      </h2>
      <p className="text-sm opacity-70">
        Ajusta cómo razona y responde LitisBot en este chat.
      </p>
    </header>
  );
}

function Footer({ onReset, onClose }) {
  return (
    <footer className="
      border-t
      px-6 py-4
      flex justify-between items-center
      bg-white dark:bg-black
      sticky bottom-0
    ">
      <button
        onClick={onReset}
        className="text-sm opacity-60 hover:underline"
      >
        Restaurar perfil
      </button>
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black"
      >
        Cerrar
      </button>
    </footer>
  );
}

/* ===========================================================================
   SECCIONES COGNITIVAS (sin lógica)
=========================================================================== */

function ModeSection({ value, onChange }) {
  return (
    <Section title="Modo principal">
      {Object.values(LITIS_MODE).map((mode) => (
        <SelectorButton
          key={mode}
          active={value === mode}
          label={MODE_LABELS[mode] ?? mode}
          onClick={() => onChange(mode)}
        />
      ))}
    </Section>
  );
}

function RoleSection({ value, onChange }) {
  return (
    <Section title="Rol cognitivo">
      {Object.values(LITIS_ROLES).map((role) => (
        <SelectorButton
          key={role}
          active={value === role}
          label={ROLE_LABELS[role] ?? role}
          onClick={() => onChange(role)}
        />
      ))}
    </Section>
  );
}

function ProfileSection({ profile, onChange }) {
  return (
    <Section title="Perfil cognitivo" columns={1}>
      <CognitiveToggle
        id="rigor"
        label="Razonamiento jurídico estricto"
        value={profile.rigor}
        onChange={onChange}
      />
      <CognitiveToggle
        id="brevedad"
        label="Respuestas breves"
        value={profile.brevedad}
        onChange={onChange}
      />
      <CognitiveToggle
        id="tonoHumano"
        label="Lenguaje humano"
        value={profile.tonoHumano}
        onChange={onChange}
      />
      <CognitiveToggle
        id="citasJuridicas"
        label="Citas jurídicas"
        value={profile.citasJuridicas}
        onChange={onChange}
      />
      <DepthSelector
        value={profile.profundidad}
        onChange={(v) => onChange({ profundidad: v })}
      />
    </Section>
  );
}

/* ===========================================================================
   CONTROLES ATÓMICOS (persistencia-ready)
=========================================================================== */

function CognitiveToggle({ id, label, value, onChange }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange({ [id]: e.target.checked })}
        className="w-4 h-4"
      />
    </label>
  );
}

function DepthSelector({ value, onChange }) {
  const options = ["baja", "media", "alta"];
  return (
    <div className="flex justify-between items-center text-sm">
      <span>Profundidad</span>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-3 py-1 text-xs rounded border ${
              value === o
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "border-black/10 dark:border-white/10"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===========================================================================
   UI UTILITIES
=========================================================================== */

function Section({ title, children, columns = 3 }) {
  return (
    <section className="pb-6 border-b border-black/10 dark:border-white/10">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <div
        className={`grid gap-2 ${
          columns === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function SelectorButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border text-sm ${
        active
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "border-black/10 dark:border-white/10"
      }`}
    >
      {label}
    </button>
  );
}
