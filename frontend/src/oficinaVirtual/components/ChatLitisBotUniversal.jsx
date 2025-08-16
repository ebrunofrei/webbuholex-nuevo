import React, { useRef, useState, useEffect } from "react";
import SidebarArchivosAnalizados from "./SidebarArchivosAnalizados";
import { Mic, Plus, LoaderCircle, Send } from "lucide-react";
import litisbotLogo from "@/assets/litisbot-logo.png";
// Aquí debes agregar tus imports de servicios y hooks

export default function ChatLitisBotUniversal({
  usuarioId, modo: modoProp, expedienteActual
}) {
  const [sidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [pensando, setPensando] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const chatRef = useRef(null);

  const modo = modoProp || "oficina"; // mejora: autodetecta por ruta si quieres

  // UX: autoscroll al enviar/recibir mensajes
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensajes, pensando]);

  // Simulación de IA
  const enviarMensaje = async (mensaje) => {
    setPensando(true);
    setMensajes((prev) => [...prev, { remitente: "user", texto: mensaje }]);
    setInput("");
    // ...llama tu backend aquí...
    setTimeout(() => {
      setMensajes((prev) => [
        ...prev,
        {
          remitente: "litisbot",
          texto: "Respuesta IA simulada para: " + mensaje
        }
      ]);
      setPensando(false);
    }, 1200);
  };

  // Adjuntar archivos manualmente
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // Lógica para subir/guardar/analizar archivo(s)
    // ...
    setShowTools(false);
  };

  // Drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    // Lógica para manejar los archivos
    // ...
  };

  // Herramientas rápidas
  const herramientas = [
    { nombre: "Redactar escrito", accion: () => setInput("Redacta un escrito legal...") },
    { nombre: "Buscar en OneDrive", accion: () => {/* lógica de vinculación */} },
    { nombre: "Importar archivo", accion: () => {/* lógica de importar */} },
    { nombre: "Exportar archivo", accion: () => {/* lógica de exportar */} },
  ];

  return (
    <div className="w-full h-screen flex bg-[#f7f5f1]">
      {/* Sidebar de archivos profesional */}
      <aside className={`h-full w-[350px] border-r bg-white shadow-md flex flex-col transition-all duration-300 ${sidebarOpen ? "" : "-ml-[350px]"}`}>
        <SidebarArchivosAnalizados usuarioId={usuarioId} expedienteActual={expedienteActual} />
      </aside>

      {/* Área principal del chat */}
      <main className="flex-1 flex flex-col items-center justify-between relative">
        {/* Top bar (sticky en móvil) */}
        <div className="w-full flex items-center justify-between px-6 py-4 border-b bg-[#6d4a28] text-white">
          <div className="flex items-center gap-3">
            <img src={litisbotLogo} alt="LitisBot" className="w-10 h-10 rounded-full bg-white" />
            <span className="font-bold text-xl">LitisBot</span>
            <span className="ml-2 px-3 py-1 rounded bg-[#b37a4e]/30 text-xs hidden sm:inline">
              {modo === "audiencia" ? "Audiencia" : "Oficina Virtual"}
            </span>
          </div>
          <div>
            {/* Vincular OneDrive */}
            <button className="ml-2 text-xs bg-[#b03a1a] px-2 py-1 rounded" title="Importar de OneDrive">
              Importar OneDrive
            </button>
            {/* Puedes agregar más integraciones aquí */}
          </div>
        </div>

        {/* Caja de herramientas rápida */}
        <div className="w-full flex gap-2 px-6 py-2 bg-[#f2e6da] border-b">
          {herramientas.map(h => (
            <button
              key={h.nombre}
              onClick={h.accion}
              className="bg-[#b03a1a] text-white px-3 py-1 rounded text-xs"
            >{h.nombre}</button>
          ))}
        </div>

        {/* Mensajes */}
        <div
          ref={chatRef}
          className={`flex-1 w-full max-w-3xl mx-auto overflow-y-auto p-6 space-y-4 bg-[#f9f7f6] ${dragActive ? "ring-2 ring-[#b03a1a]" : ""}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{ minHeight: "300px" }}
        >
          {mensajes.length === 0 && (
            <div className="text-center text-[#a08165] mt-16 text-lg">Bienvenido. Escribe tu consulta, sube archivos o usa las herramientas rápidas.</div>
          )}
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`max-w-[75%] px-5 py-3 rounded-2xl shadow ${m.remitente === "user"
                ? "bg-white ml-auto border border-[#b03a1a] text-right"
                : "bg-[#ffe6c6] mr-auto border border-[#b37a4e] text-left"}`}
            >
              {m.texto}
            </div>
          ))}
          {pensando && (
            <div className="flex items-center gap-2 text-[#6d4a28]">
              <LoaderCircle className="animate-spin" size={20} />
              Analizando...
            </div>
          )}
        </div>

        {/* Input: barra fija tipo ChatGPT */}
        <form
          className="w-full max-w-3xl mx-auto flex items-center gap-2 px-4 py-4 bg-[#f7f5f1] sticky bottom-0"
          onSubmit={e => { e.preventDefault(); if (input.trim()) enviarMensaje(input); }}
        >
          {/* Botón + para adjuntar */}
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f4ede4] hover:bg-[#ecd5b0]"
            title="Adjuntar archivo"
            onClick={() => fileInputRef.current.click()}
          >
            <Plus size={18} className="text-[#6d4a28]" />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              multiple
            />
          </button>

          {/* Micrófono */}
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f4ede4] hover:bg-[#ecd5b0]"
            title="Dictar por voz"
            // onClick={startDictado}
            disabled
          >
            <Mic size={18} className="text-[#b03a1a]" />
          </button>

          {/* Input real */}
          <input
            className="flex-1 px-4 py-3 border border-[#e7dacb] rounded-2xl outline-none text-base bg-white"
            placeholder={pensando ? "Espere respuesta..." : "Escriba su consulta o comando..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={pensando}
            autoFocus
          />

          {/* Enviar */}
          <button
            type="submit"
            className="w-12 h-10 rounded-full flex items-center justify-center bg-[#b03a1a] hover:bg-[#4a2e16] text-white ml-1"
            disabled={pensando || !input.trim()}
            title="Enviar"
          >
            {pensando ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </main>
    </div>
  );
}
