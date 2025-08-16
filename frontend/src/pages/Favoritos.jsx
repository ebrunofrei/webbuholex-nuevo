import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerFavoritosLitisBot, obtenerHistorialArchivos } from "../services/firebaseLitisBotService";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

export default function Favoritos() {
  const { user } = useAuth();
  const [favoritosChat, setFavoritosChat] = useState([]);
  const [favoritosArchivos, setFavoritosArchivos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    if (user && user.uid) {
      obtenerFavoritosLitisBot(user.uid).then(setFavoritosChat);
      obtenerHistorialArchivos(user.uid).then(archs => {
        setFavoritosArchivos((archs || []).filter(a => a.favorito));
      });
    }
  }, [user]);

  const favoritosUnificados = [
    ...(filtro === "archivos" || filtro === "todos"
      ? favoritosArchivos.map(a => ({ ...a, tipoFavorito: "archivo" }))
      : []),
    ...(filtro === "chat" || filtro === "todos"
      ? favoritosChat.map(m => ({ ...m, tipoFavorito: "chat" }))
      : []),
  ].filter(f =>
    f.content?.toLowerCase()?.includes(busqueda.toLowerCase()) ||
    f.nombre?.toLowerCase()?.includes(busqueda.toLowerCase())
  );

  // Exportar en Word
  const exportarFavoritosWord = async () => {
    const children = favoritosUnificados.map((f, idx) => {
      if (f.tipoFavorito === "chat") {
        return new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: `[Chat] ${f.role === "assistant" ? "LitisBot" : "Tú"}:`,
              bold: true,
              color: "b03a1a",
            }),
            new TextRun({
              text: ` ${f.content}`,
              color: "4b2e19",
            }),
          ],
        });
      } else {
        return new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `[Archivo]`, bold: true, color: "b03a1a" }),
            new TextRun({
              text: ` ${f.nombre} - ${f.tipo || ""} - ${f.fecha ? new Date(f.fecha).toLocaleString() : ""}`,
              color: "4b2e19",
            }),
            f.url
              ? new TextRun({
                  text: `  [Descargar](${f.url})`,
                  style: "Hyperlink",
                })
              : null,
          ].filter(Boolean),
        });
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Favoritos de LitisBot", bold: true, size: 32, color: "b03a1a" })],
              spacing: { after: 400 },
            }),
            ...children,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "favoritos-litisbot.docx");
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-[#b03a1a] mb-5">Favoritos</h1>
      <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar en favoritos (mensaje, nombre, tipo...)"
          className="flex-1 border px-3 py-2 rounded text-[#4b2e19]"
        />
        <select
          className="border rounded px-2 py-2"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="chat">Sólo chat</option>
          <option value="archivos">Sólo archivos</option>
        </select>
        <button
          onClick={exportarFavoritosWord}
          className="bg-[#b03a1a] text-white rounded-xl px-6 py-2 font-bold hover:bg-[#a52e00] transition"
        >
          Exportar en Word
        </button>
      </div>
      <div className="space-y-4">
        {favoritosUnificados.length === 0 && (
          <div className="text-[#b03a1a] text-lg mt-10">No tienes favoritos aún.</div>
        )}
        {favoritosUnificados.map((fav, i) =>
          fav.tipoFavorito === "chat" ? (
            <div key={fav.id || i} className="p-4 bg-white border-[#b03a1a33] border rounded-xl shadow flex gap-4 items-start relative">
              <span
                style={{
                  color: "#b03a1a", fontSize: 22,
                  position: "absolute", right: 10, top: 10
                }}
              >★</span>
              <div>
                <div className="font-bold text-[#4b2e19]">
                  {fav.role === "assistant" ? "LitisBot" : "Tú"}
                  <span className="ml-3 text-xs text-[#b03a1a]">
                    {fav.timestamp && new Date(fav.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-[#4b2e19] whitespace-pre-line">{fav.content}</div>
              </div>
            </div>
          ) : (
            <div key={fav.id || i} className="p-4 bg-[#fde7e7] border-[#b03a1a33] border rounded-xl shadow flex gap-4 items-start relative">
              <span
                style={{
                  color: "#b03a1a", fontSize: 22,
                  position: "absolute", right: 10, top: 10
                }}
              >★</span>
              <div>
                <div className="font-bold text-[#b03a1a]">Archivo favorito</div>
                <div className="text-[#4b2e19]">{fav.nombre || "Sin nombre"}</div>
                <div className="text-sm text-[#b03a1a]">{fav.tipo || ""} · {fav.fecha && new Date(fav.fecha).toLocaleString()}</div>
                {fav.url && (
                  <a
                    href={fav.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-[#b03a1a] underline font-bold"
                  >
                    Descargar
                  </a>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
