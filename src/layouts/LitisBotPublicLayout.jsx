import React from "react";

export default function LitisBotPublicLayout({ children }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAF8F5] text-[#5C2E0B]">
      
      {/* Header */}
      <header className="w-full border-b border-[#e7d8c3] bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src="/og-buholex.png"
            alt="BúhoLex"
            className="w-8 h-8"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-[15px]">Litis</span>
            <span className="text-xs text-[#7a4a2e]">
              Asistente jurídico inteligente
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex justify-center px-3 py-4">
        <div
          className="
            w-full
            max-w-4xl
            bg-white
            rounded-2xl
            shadow-sm
            border border-[#f0e2cd]
            overflow-hidden
            flex
            flex-col
          "
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#8b6b52] py-3">
        Litis no reemplaza asesoría legal profesional.
      </footer>
    </div>
  );
}
