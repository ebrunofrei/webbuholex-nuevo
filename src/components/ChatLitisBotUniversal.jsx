import React, { useRef, useState, useEffect } from "react";
import { FaPaperclip, FaMicrophone, FaBroom, FaChevronLeft } from "react-icons/fa";
import { MdMenu } from "react-icons/md";
import ModalHerramientas from "./ModalHerramientas";
import SidebarChats from "./SidebarChats";
import buhoLogo from "@/assets/litisbot-logo.png";

export default function ChatLitisBotUniversal({ user, pro = false }) {
  const [mensajes, setMensajes] = useState([
    { role: "system", content: pro
      ? "🦉 Bienvenido a LitisBot PRO. Accede a todas las herramientas avanzadas, memoria y acompañamiento experto."
      : "🦉 Bienvenido a LitisBot. Consulta básica y modelos legales para el público general."
    }
  ]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Para mobile
  const chatRef = useRef(null);

  // Auto-scroll al final
  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [mensajes]);

  // Envía mensaje a la IA (adapta a tu backend)
  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setEnviando(true);
    setMensajes(msgs => [...msgs, { role: "user", content: input }]);
    // Simula respuesta
    setTimeout(() => {
      setMensajes(msgs => [...msgs, { role: "assistant", content: "Respuesta IA simulada: " + input }]);
      setEnviando(false);
    }, 900);
    setInput("");
  }

  // Limpiar chat
  function limpiarChat() {
    setMensajes([
      { role: "system", content: pro
        ? "🦉 Bienvenido a LitisBot PRO. Accede a todas las herramientas avanzadas, memoria y acompañamiento experto."
        : "🦉 Bienvenido a LitisBot. Consulta básica y modelos legales para el público general."
      }
    ]);
  }

  // Responsive sidebar (móvil)
  function handleSidebar() {
    setSidebarOpen(val => !val);
  }

  return (
    <div className="flex h-screen w-screen bg-white text-[#7a4422] font-sans overflow-hidden">

      {/* SIDEBAR: Oculto en móvil */}
      <aside className={`h-full bg-white border-r border-brown-100 transition-all duration-200 z-20
        ${sidebarOpen ? "w-[320px] min-w-[260px]" : "w-0 min-w-0 overflow-hidden"}
        fixed md:static left-0 top-0 md:block`}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-brown-100">
          <img src={buhoLogo} className="h-10 rounded-full" alt="LitisBot" />
          <span className="font-bold text-xl">LitisBot</span>
        </div>
        <SidebarChats />
      </aside>

      {/* BOTÓN MENU PARA MÓVIL */}
      <button
        onClick={handleSidebar}
        className="md:hidden absolute top-3 left-3 bg-brown-100 text-[#7a4422] p-2 rounded-full z-30 shadow"
        title="Abrir menú"
      >
        <MdMenu size={26} />
      </button>

      {/* MAIN CHAT */}
      <main className="flex-1 h-full flex flex-col relative md:ml-0 ml-[0px] bg-white">
        {/* Barra superior */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-brown-100 bg-white">
          <button onClick={limpiarChat} title="Limpiar chat" className="text-brown-400 hover:text-red-500 mr-2">
            <FaBroom size={22} />
          </button>
          <span className="text-lg font-bold">{pro ? "Chat Legal PRO" : "Chat Legal General"}</span>
          <span className="flex-1"></span>
          {/* BOTÓN HERRAMIENTAS */}
          <button
            onClick={() => setShowTools(true)}
            className="flex items-center gap-1 bg-brown-50 text-[#7a4422] px-3 py-2 rounded hover:bg-brown-100 font-medium"
            title="Herramientas rápidas"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
              <path d="M4 8h16M4 16h16" strokeLinecap="round"/>
            </svg>
            Herramientas
          </button>
          <span className="ml-4 text-xs text-brown-300">{pro ? "PRO: acceso a todo" : "Básico"}</span>
        </div>

        {/* CHAT */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-4 bg-white">
          {mensajes.map((m, i) => (
            <div key={i} className={`my-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <span className={`px-4 py-2 rounded-2xl shadow-sm 
                ${m.role === "assistant"
                  ? "bg-brown-50 text-[#7a4422]"
                  : "bg-[#7a4422]/10 text-[#7a4422] font-semibold"
                }`}
                style={{ maxWidth: "80%", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                {m.content}
              </span>
            </div>
          ))}
        </div>

        {/* INPUT */}
        <form
          className="flex gap-2 items-center border-t border-brown-100 px-6 py-4 bg-white"
          onSubmit={handleSend}
        >
          {/* Adjuntar archivo */}
          <label className="cursor-pointer p-2 hover:bg-brown-50 rounded-full">
            <FaPaperclip size={19} />
            <input type="file" style={{ display: "none" }} />
          </label>
          {/* Microfono */}
          <button type="button" className="p-2 hover:bg-brown-50 rounded-full" title="Dictar">
            <FaMicrophone size={20} />
          </button>
          {/* Input texto */}
          <input
            className="flex-1 px-4 py-2 rounded-full border border-brown-200 focus:outline-none"
            type="text"
            placeholder="Escribe tu consulta legal, comando o adjunta archivo…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={enviando}
          />
          {/* Enviar */}
          <button
            className="bg-[#7a4422] text-white font-semibold px-5 py-2 rounded-full hover:bg-[#583016] transition"
            type="submit"
            disabled={enviando || !input.trim()}
            title="Enviar"
          >
            Enviar
          </button>
        </form>

        {/* Modal Herramientas */}
        {showTools &&
          <ModalHerramientas pro={pro} onClose={() => setShowTools(false)} />
        }
      </main>
    </div>
  );
}
