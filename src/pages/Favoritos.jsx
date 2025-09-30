// src/pages/Favoritos.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  obtenerFavoritosLitisBot,
  obtenerHistorialArchivos,
} from "@services/firebaseLitisBotService";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

export default function Favoritos() {
  const { user } = useAuth();
  const [favoritosChat, setFavoritosChat] = useState([]);
  const [favoritosArchivos, setFavoritosArchivos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    if (!user?.uid) return;

    async function cargarFavoritos() {
      try {
        const chats = await obtenerFavoritosLitisBot(user.uid);
        setFavoritosChat(chats || []);
      } catch (err) {
        console.error("❌ Error cargando favoritos de chat:", err);
        setFavoritosChat([]);
      }

      try {
        const archivos = await obtenerHistorialArchivos(user.uid);
        setFavoritosArchivos((archivos || []).filter((a) => a.favorito));
      } catch (err) {
        console.error("❌ Error cargando historial de archivos:", err);
        setFavoritosArchivos([]);
      }
    }

    cargarFavoritos();
  }, [user]);

  // Unificación y filtro de favoritos
  const favoritosUnificados = [
    ...(filtro === "archivos" || filtro === "todos"
      ? favoritosArchivos.map((a) => ({ ...a, tipoFavorito: "archivo" }))
      : []),
    ...(filtro === "chat" || filtro === "todos"
      ? favoritosChat.map((m) => ({ ...m, tipoFavorito: "chat" }))
      : []),
  ].filter(
    (f) =>
      f.content?.toLowerCase()?.includes(busqueda.toLowerCase()) ||
      f.nombre?.toLowerCase()?.includes(busqueda.toLowerCase())
  );

  // Exportar favoritos a Word
  const exportarFavoritosWord = async () => {
    if (favoritosUnificados.length === 0) return;

    const children = favoritosUnificados.map((f) => {
      if (f.tipoFavorito === "chat") {
        return new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: `[Chat] ${f.role === "assistant" ? "LitisBot" : "Tú"}: `,
              bold: true,
              color: "b03a1a",
            }),
            new TextRun({
              text: f.content || "",
              color: "4b2e19",
            }),
            new TextRun({
              text: f.timestamp
                ? `  (${new Date(f.timestamp).toLocaleString()})`
                : "",
              italics: true,
              size: 20,
              color: "777777",
            }),
          ],
        });
      } else {
        return new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "[Archivo] ", bold: true, color: "b03a1a" }),
            new TextRun({
              text: `${f.nombre || "Sin nombre"} - ${f.tipo || ""} - ${
                f.fecha ? new Date(f.fecha).toLocaleString() : ""
              }`,
              color: "4b2e19",
            }),
            f.url
              ? new TextRun({
                  text: `  [Descargar aquí]`,
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
              children: [
                new TextRun({
                  text: "Favoritos de LitisBot",
                  bold: true,
                  size: 32,
                  color: "b03a1a",
                }),
              ],
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
      <h1 className="text-3xl font-bold text-[#b03a1a] mb-5">⭐ Favoritos</h1>

      {/* Filtros y acciones */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en favoritos (mensaje, nombre, tipo...)"
          className="flex-1 border px-3 py-2 rounded text-[#4b2e19] focus:ring-2 focus:ring-[#b03a1a]"
        />
        <select
          className="border rounded px-2 py-2 text-[#4b2e19]"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="chat">Sólo chat</option>
          <option value="archivos">Sólo archivos</option>
        </select>
        <button
          onClick={exportarFavoritosWord}
          disabled={favoritosUnificados.length === 0}
          className={`px-6 py-2 rounded-xl font-bold transition ${
            favoritosUnificados.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#b03a1a] text-white hover:bg-[#a52e00]"
          }`}
        >
          Exportar en Word
        </button>
      </div>

      {/* Lista de favoritos */}
      <div className="space-y-4">
        {favoritosUnificados.length === 0 && (
          <div className="text-[#b03a1a] text-lg mt-10">
            No tienes favoritos aún.
          </div>
        )}

        {favoritosUnificados.map((fav, i) =>
          fav.tipoFavorito === "chat" ? (
            <div
              key={fav.id || i}
              className="p-4 bg-white border border-[#b03a1a33] rounded-xl shadow relative"
            >
              <span className="absolute right-3 top-3 text-[#b03a1a] text-xl">
                ★
              </span>
              <div>
                <div className="font-bold text-[#4b2e19]">
                  {fav.role === "assistant" ? "LitisBot" : "Tú"}
                  <span className="ml-3 text-xs text-[#b03a1a]">
                    {fav.timestamp &&
                      new Date(fav.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-[#4b2e19] whitespace-pre-line mt-1">
                  {fav.content}
                </div>
              </div>
            </div>
          ) : (
            <div
              key={fav.id || i}
              className="p-4 bg-[#fde7e7] border border-[#b03a1a33] rounded-xl shadow relative"
            >
              <span className="absolute right-3 top-3 text-[#b03a1a] text-xl">
                ★
              </span>
              <div>
                <div className="font-bold text-[#b03a1a]">Archivo favorito</div>
                <div className="text-[#4b2e19]">{fav.nombre || "Sin nombre"}</div>
                <div className="text-sm text-[#b03a1a]">
                  {fav.tipo || ""} ·{" "}
                  {fav.fecha && new Date(fav.fecha).toLocaleString()}
                </div>
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
