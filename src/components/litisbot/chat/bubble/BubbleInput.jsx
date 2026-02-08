/* ======================================================
   BubbleInput.jsx - REFACTOR DE INDEPENDENCIA
====================================================== */
import { useRef, useState } from "react";

export default function BubbleInput({ onSend, loading }) {
  const [text, setText] = useState(""); // Usar estado en lugar de solo ref para validación reactiva
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const canSend = (text.trim().length > 0 || file !== null) && !loading;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSend) return;

    // Enviamos lo que tengamos (texto, archivo o ambos)
    onSend(text, file);

    // Limpieza total
    setText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {/* Visualizador de PDF (si existe) */}
      {file && (
        <div className="flex items-center justify-between bg-red-50 p-2 rounded-lg border border-red-100 animate-in fade-in zoom-in duration-300">
          <span className="text-[10px] font-mono text-red-600 truncate">📄 {file.name}</span>
          <button type="button" onClick={() => setFile(null)} className="text-red-400">✕</button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Botón Adjuntar */}
        <label className="cursor-pointer p-1 hover:bg-slate-100 rounded transition-colors">
          <span className={file ? "text-red-600" : "text-slate-400"}>📎</span>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {/* Input de Texto - Ahora con value y onChange para reactividad */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu consulta jurídica..."
          className="flex-1 bg-transparent outline-none text-sm text-slate-700"
          disabled={loading}
        />

        {/* Botón Enviar - Validado por canSend */}
        <button 
          type="submit" 
          disabled={!canSend}
          className={`transition-all ${canSend ? "text-slate-900" : "text-slate-300"}`}
        >
          ➤
        </button>
      </div>
    </form>
  );
}