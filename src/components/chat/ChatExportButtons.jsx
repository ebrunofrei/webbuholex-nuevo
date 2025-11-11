import React, { useState } from "react";
import { joinApi } from "@/services/apiBase.js";

export default function ChatExportButtons({ title="Informe LitisBot", content="", citations=[] }) {
  const [loading, setLoading] = useState(false);

  async function exportar(format) {
    try {
      setLoading(true);
      const r = await fetch(joinApi("/export"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, title, content, citations }),
      });
      if (!r.ok) throw new Error("Export falló");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-export-buttons">
      <button onClick={() => exportar("docx")} disabled={loading}>Descargar Word</button>
      <button onClick={() => exportar("xlsx")} disabled={loading}>Descargar Excel</button>
      <button onClick={() => exportar("pdf")}  disabled={loading}>Descargar PDF</button>
    </div>
  );
}
