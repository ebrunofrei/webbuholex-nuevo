import { MdSecurity, MdMenu } from "react-icons/md";

/* ============================================================================
   R7.7 — GENERAL CHAT HEADER (WITH SIDEBAR TOGGLE)
============================================================================ */

export default function GeneralChatHeader({ onToggleSidebar }) {
  return (
    <header className="
      flex-shrink-0
      h-16
      flex
      items-center
      justify-between
      border-b
      border-slate-200
      px-4
      md:px-8
      bg-white
      sticky
      top-0
      z-50
    ">
      {/* LEFT — Toggle + Brand */}
      <div className="flex items-center gap-3 min-w-0">
        {/* ☰ MOBILE TOGGLE */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <MdMenu size={22} />
        </button>

        <img
          src="/icons/icon-192.png"
          alt="LitisBot"
          className="w-8 h-8 rounded-lg flex-shrink-0"
        />

        <div className="leading-none truncate">
          <div className="font-black uppercase text-sm truncate">
            LitisBot
          </div>
          <div className="text-[9px] text-slate-400 uppercase tracking-widest">
            Kernel R7.7++
          </div>
        </div>
      </div>

      {/* RIGHT — SECURITY (desktop only) */}
      <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
        <MdSecurity className="text-green-600" />
        Cifrado legal activo
      </div>
    </header>
  );
}
