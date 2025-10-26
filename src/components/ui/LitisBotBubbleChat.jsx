import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  FaPaperclip,
  FaMicrophone,
  FaPaperPlane,
  FaVolumeUp,
  FaRegCopy,
  FaRegEdit,
  FaRegThumbsUp,
  FaRegThumbsDown,
} from "react-icons/fa";
import litisLogo from "@/assets/litisbot-logo.png";

/* ============================================================
   🔊 Texto → voz varonil desde backend (POST /voz)
============================================================ */
async function reproducirVozServidor(textoPlano) {
  try {
    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    const clean = (textoPlano || "").trim();
    if (!clean) return;

    const resp = await fetch(`${API_BASE}/voz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto: clean,
        voz: "masculina_profesional",
      }),
    });

    if (!resp.ok) {
      console.warn("⚠️ No se pudo generar voz:", resp.status);
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);

    await audio.play().catch((e) => {
      console.error("🎧 Error al hacer play():", e);
      URL.revokeObjectURL(url);
    });
  } catch (err) {
    console.error("❌ Error en TTS burbuja:", err);
  }
}

/* ============================================================
   Utilidades de formato (copiar limpio para Word)
============================================================ */
function toPlain(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || html || "";
}

function prepararTextoParaCopia(html) {
  const plano = toPlain(html);

  // normalizar saltos de línea para que el abogado pegue en Word
  return plano
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================================================
   💬 Mensaje del ASISTENTE (burbuja blanca)
============================================================ */
function MensajeBotBubble({ msg, onCopy, onEdit, onFeedback }) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content || "");
  const [leyendo, setLeyendo] = useState(false);

  async function handleSpeak() {
    if (leyendo) return;
    setLeyendo(true);
    try {
      await reproducirVozServidor(toPlain(msg.content));
    } finally {
      setLeyendo(false);
    }
  }

  function handleGuardar() {
    setEditando(false);
    onEdit && onEdit(editValue);
  }

  function handleCopiar() {
    const limpio = prepararTextoParaCopia(msg.content);
    navigator.clipboard
      .writeText(limpio)
      .then(() => {
        onCopy && onCopy(limpio);
      })
      .catch(() => {});
  }

  return (
    <div
      className="flex flex-col w-fit max-w-[92%] rounded-[1.5rem] shadow border px-4 py-4"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "rgba(92,46,11,0.15)",
        color: "#5C2E0B",
      }}
    >
      {!editando ? (
        <div
          className="leading-relaxed whitespace-pre-wrap break-words text-[16px]"
          style={{ textAlign: "justify", wordBreak: "break-word" }}
          dangerouslySetInnerHTML={{ __html: msg.content }}
        />
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <textarea
            className="w-full border rounded p-2 text-[15px] leading-relaxed"
            style={{
              borderColor: "rgba(92,46,11,0.3)",
              color: "#5C2E0B",
            }}
            rows={4}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex gap-4 text-[15px]">
            <button
              className="font-semibold"
              style={{ color: "#0f5132" }}
              onClick={handleGuardar}
            >
              Guardar
            </button>
            <button
              style={{ color: "#842029" }}
              onClick={() => {
                setEditando(false);
                setEditValue(msg.content || "");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!editando && (
        <div className="flex flex-row flex-wrap items-center gap-4 mt-4 text-[18px]">
          {/* voz */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{
              background: "#5C2E0B",
              color: "#fff",
              opacity: leyendo ? 0.6 : 1,
            }}
            aria-label="Leer en voz alta"
            title="Leer en voz alta"
            disabled={leyendo}
            onClick={handleSpeak}
          >
            <FaVolumeUp size={16} />
          </button>

          {/* copiar */}
          <button
            style={{ color: "#5C2E0B" }}
            onClick={handleCopiar}
            title="Copiar para Word / PDF"
            aria-label="Copiar"
          >
            <FaRegCopy size={18} />
          </button>

          {/* editar */}
            <button
              style={{ color: "#5C2E0B" }}
              onClick={() => setEditando(true)}
              title="Editar borrador"
              aria-label="Editar"
            >
              <FaRegEdit size={18} />
            </button>

          {/* like / dislike */}
          <button
            style={{ color: "#0f5132" }} // verde
            onClick={() => onFeedback && onFeedback("up")}
            title="Respuesta útil"
            aria-label="Respuesta útil"
          >
            <FaRegThumbsUp size={18} />
          </button>

          <button
            style={{ color: "#842029" }} // rojo
            onClick={() => onFeedback && onFeedback("down")}
            title="Respuesta no útil"
            aria-label="Respuesta no útil"
          >
            <FaRegThumbsDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   💬 Mensaje del USUARIO (burbuja marrón)
============================================================ */
function MensajeUsuarioBubble({ texto }) {
  return (
    <div className="flex justify-end w-full">
      <div
        className="rounded-[1.5rem] shadow px-4 py-3 text-white text-[16px] leading-relaxed font-medium max-w-[88%]"
        style={{ background: "#5C2E0B" }}
      >
        {texto}
      </div>
    </div>
  );
}

/* ============================================================
   📱 Hook: detectar si estamos en móvil
============================================================ */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

/* ============================================================
   🪟 ChatWindow
   - YA NO está definido dentro del componente principal.
   - Esto evita el remount constante y mantiene el cursor.
============================================================ */
function ChatWindow({
  isOpen,
  isMobile,
  pro,
  feedRef,
  mensajes,
  cargando,
  input,
  setInput,
  handleKeyDown,
  enviarMensaje,
  setMensajes,
  setIsOpen,
}) {
  if (!isOpen) return null;

  const headerBg = "#5C2E0B";
  const headerColor = "#fff";

  /* ============ MODO MÓVIL: fullscreen tipo app de mensajería ============ */
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-[9998] flex flex-col bg-white"
        style={{
          backgroundColor: "#ffffff",
          color: "#5C2E0B",
        }}
      >
        {/* Header fijo arriba */}
        <div
          className="flex items-center justify-between px-3 py-2 shadow-md"
          style={{ background: headerBg, color: headerColor }}
        >
          <div className="flex items-center gap-2 text-white font-semibold text-[15px] leading-tight">
            <div
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden"
              style={{
                color: "#5C2E0B",
                fontWeight: "bold",
                fontSize: "11px",
              }}
            >
              <img
                src={litisLogo}
                alt="LitisBot"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span>LitisBot</span>
              <span className="text-[11px] font-normal opacity-80">
                {pro ? "Acceso Pro" : "Asistencia básica"}
              </span>
            </div>
          </div>

          <button
            className="text-white font-bold text-xl leading-none px-2"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar chat"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Mensajes scroll */}
        <div
          ref={feedRef}
          className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-3 py-3"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="flex flex-col gap-4">
            {mensajes.map((m, idx) =>
              m.role === "assistant" ? (
                <div
                  key={idx}
                  className="flex w-full justify-start text-[#5C2E0B]"
                >
                  <MensajeBotBubble
                    msg={m}
                    onCopy={(textoLimpio) => {
                      // hook de métrica "copiado"
                      console.log("copiado:", textoLimpio);
                    }}
                    onEdit={(nuevo) => {
                      setMensajes((prev) => {
                        const cl = [...prev];
                        cl[idx] = { ...cl[idx], content: nuevo };
                        return cl;
                      });
                    }}
                    onFeedback={(tipo) => {
                      // hook de métrica feedback
                      console.log("feedback burbuja", tipo);
                    }}
                  />
                </div>
              ) : (
                <MensajeUsuarioBubble key={idx} texto={m.content} />
              )
            )}

            {cargando && (
              <div className="flex w-full justify-start">
                <div
                  className="rounded-[1.5rem] shadow text-[15px] max-w-[80%] px-4 py-3"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(92,46,11,0.15)",
                    color: "#5C2E0B",
                  }}
                >
                  Procesando…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra fija abajo */}
        <div
          className="flex items-end gap-3 px-3 py-3 border-t"
          style={{
            borderColor: "rgba(92,46,11,0.2)",
            backgroundColor: "#ffffff",
            flexShrink: 0,
          }}
        >
          {/* Adjuntar (placeholder visual) */}
          <button
            className="flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
            style={{ background: "#5C2E0B" }}
            title="Adjuntar archivo"
          >
            <FaPaperclip size={18} />
          </button>

          {/* Área de texto controlada */}
          <textarea
            className="
              flex-1 bg-transparent outline-none border rounded-lg
              text-[15px] leading-relaxed text-[#5C2E0B]
              max-h-[160px] overflow-y-auto px-3 py-2
            "
            style={{
              borderColor: "rgba(92,46,11,0.2)",
              minHeight: "48px",
              backgroundColor: "#ffffff",
            }}
            placeholder="Escribe tu consulta legal…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />

          {/* Mic (placeholder visual) */}
          <button
            className="flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
            style={{ background: "#5C2E0B" }}
            title="Dictado por voz"
          >
            <FaMicrophone size={18} />
          </button>

          {/* Enviar */}
          <button
            className={`flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform ${
              !input.trim() || cargando ? "opacity-50 cursor-not-allowed" : ""
            }`}
            style={{ background: "#5C2E0B" }}
            disabled={!input.trim() || cargando}
            onClick={enviarMensaje}
            title="Enviar"
          >
            <FaPaperPlane size={18} />
          </button>
        </div>
      </div>
    );
  }

  /* ============ MODO DESKTOP: tarjeta flotante elegante ============ */
  return (
    <div
      className="fixed z-[9998] flex flex-col rounded-[1rem] shadow-2xl border overflow-hidden bg-white"
      style={{
        borderColor: "rgba(92,46,11,0.3)",
        backgroundColor: "#ffffff",
        color: "#5C2E0B",
        bottom: "96px", // deja espacio sobre botón Noticias
        right: "24px",
        width: "460px",
        maxHeight: "80vh",
      }}
    >
      {/* Header marrón */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: headerBg, color: headerColor }}
      >
        <div className="flex items-center gap-2 text-white font-semibold text-[15px] leading-tight">
          <div
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden"
            style={{
              color: "#5C2E0B",
              fontWeight: "bold",
              fontSize: "11px",
            }}
          >
            <img
              src={litisLogo}
              alt="LitisBot"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span>LitisBot</span>
            <span className="text-[11px] font-normal opacity-80">
              {pro
                ? "Acceso Pro • Estrategia legal avanzada"
                : "Asistencia básica"}
            </span>
          </div>
        </div>

        <button
          className="text-white font-bold text-xl leading-none px-2"
          onClick={() => setIsOpen(false)}
          aria-label="Cerrar chat"
          title="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Lista de mensajes */}
      <div
        ref={feedRef}
        className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-4 py-4"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="flex flex-col gap-4">
          {mensajes.map((m, idx) =>
            m.role === "assistant" ? (
              <div
                key={idx}
                className="flex w-full justify-start text-[#5C2E0B]"
              >
                <MensajeBotBubble
                  msg={m}
                  onCopy={(textoLimpio) => {
                    console.log("copiado:", textoLimpio);
                  }}
                  onEdit={(nuevo) => {
                    setMensajes((prev) => {
                      const cl = [...prev];
                      cl[idx] = { ...cl[idx], content: nuevo };
                      return cl;
                    });
                  }}
                  onFeedback={(tipo) => {
                    console.log("feedback burbuja", tipo);
                  }}
                />
              </div>
            ) : (
              <MensajeUsuarioBubble key={idx} texto={m.content} />
            )
          )}

          {cargando && (
            <div className="flex w-full justify-start">
              <div
                className="rounded-[1.5rem] shadow text-[15px] max-w-[80%] px-4 py-3"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(92,46,11,0.15)",
                  color: "#5C2E0B",
                }}
              >
                Procesando…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer de redacción */}
      <div
        className="flex items-end gap-3 px-4 py-3 border-t"
        style={{
          borderColor: "rgba(92,46,11,0.2)",
          backgroundColor: "#ffffff",
          flexShrink: 0,
        }}
      >
        {/* Adjuntar */}
        <button
          className="flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
          style={{ background: "#5C2E0B" }}
          title="Adjuntar archivo"
        >
          <FaPaperclip size={18} />
        </button>

        {/* Textarea amplia y cómoda */}
        <textarea
          className="
            flex-1 bg-transparent outline-none border rounded-lg
            text-[15px] leading-relaxed text-[#5C2E0B]
            max-h-[160px] overflow-y-auto px-3 py-2
          "
          style={{
            borderColor: "rgba(92,46,11,0.2)",
            minHeight: "48px",
            backgroundColor: "#ffffff",
          }}
          placeholder={
            pro
              ? "Formula tu consulta jurídica avanzada…"
              : "Escribe tu consulta legal…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />

        {/* Mic (placeholder) */}
        <button
          className="flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
          style={{ background: "#5C2E0B" }}
          title="Dictado por voz"
        >
          <FaMicrophone size={18} />
        </button>

        {/* Enviar */}
        <button
          className={`flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform ${
            !input.trim() || cargando ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={{ background: "#5C2E0B" }}
          disabled={!input.trim() || cargando}
          onClick={enviarMensaje}
          title="Enviar"
        >
          <FaPaperPlane size={18} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   🌐 Componente principal flotante LitisBotBubbleChat
============================================================ */
export default function LitisBotBubbleChat({ usuarioId, pro }) {
  const isMobile = useIsMobile();

  // abrir / cerrar ventana de chat
  const [isOpen, setIsOpen] = useState(false);

  // input del usuario
  const [input, setInput] = useState("");

  // flag de request en curso
  const [cargando, setCargando] = useState(false);

  // historial mínimo
  const [mensajes, setMensajes] = useState([
    {
      role: "assistant",
      content:
        "Hola, soy LitisBot. ¿En qué puedo ayudarte hoy? 👋",
    },
  ]);

  // autoscroll al final cuando llegan mensajes nuevos
  const feedRef = useRef(null);
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [mensajes, isOpen]);

  /* ---------------- Drag del botón flotante (solo desktop) ---------------- */
  const [pos, setPos] = useState({ x: null, y: null }); // posición manual
  const dragRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDownBubble = useCallback(
    (e) => {
      if (isMobile) return;
      dragging.current = true;
      const rect = dragRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      e.preventDefault();
    },
    [isMobile]
  );

  const onMouseMove = useCallback(
    (e) => {
      if (!dragging.current || isMobile) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPos({ x: newX, y: newY });
    },
    [isMobile]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    if (isMobile) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isMobile, onMouseMove, onMouseUp]);

  /* ---------------- Enviar mensaje al backend ---------------- */
  async function enviarMensaje() {
    if (!input.trim() || cargando) return;
    const pregunta = input.trim();
    setInput("");
    setCargando(true);

    // pinta usuario + placeholder del bot
    setMensajes((prev) => [
      ...prev,
      { role: "user", content: pregunta },
      { role: "assistant", content: "Espera un momento…" },
    ]);

    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

      const body = {
        prompt: pregunta,
        usuarioId: usuarioId || "invitado-burbuja",
        expedienteId: "burbuja",
        idioma: "es-PE",
        pais: "Perú",
        // si pro === true podrías pasar { modo: "pro" } para lógica premium
      };

      const resp = await fetch(`${API_BASE}/ia/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      // reemplazar "Espera un momento…" por la respuesta final
      setMensajes((prev) => {
        const temp = [...prev];
        if (
          temp.length > 0 &&
          temp[temp.length - 1].role === "assistant" &&
          temp[temp.length - 1].content === "Espera un momento…"
        ) {
          temp.pop();
        }

        temp.push({
          role: "assistant",
          content:
            data?.respuesta ||
            "No pude generar respuesta. ¿Quieres intentar de nuevo?",
        });

        return temp;
      });
    } catch (err) {
      console.error("❌ Error burbuja:", err);

      setMensajes((prev) => {
        const temp = [...prev];
        if (
          temp.length > 0 &&
          temp[temp.length - 1].role === "assistant" &&
          temp[temp.length - 1].content === "Espera un momento…"
        ) {
          temp.pop();
        }
        temp.push({
          role: "assistant",
          content:
            "Hubo un problema procesando tu consulta. Intenta nuevamente en un momento.",
        });
        return temp;
      });
    } finally {
      setCargando(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  }

  /* ---------------- FAB flotante (botón redondo con logo) ---------------- */
  const bubbleStyleDesktop =
    pos.x !== null && pos.y !== null
      ? { left: pos.x, top: pos.y }
      : { bottom: "24px", right: "24px" };

  const bubbleStyleMobile = {
    bottom: "96px", // levantado para no chocar con "Noticias"
    right: "16px",
  };

  return (
    <>
      {/* Ventana del chat (card desktop / fullscreen móvil) */}
      <ChatWindow
        isOpen={isOpen}
        isMobile={isMobile}
        pro={pro}
        feedRef={feedRef}
        mensajes={mensajes}
        cargando={cargando}
        input={input}
        setInput={setInput}
        handleKeyDown={handleKeyDown}
        enviarMensaje={enviarMensaje}
        setMensajes={setMensajes}
        setIsOpen={setIsOpen}
      />

      {/* Botón flotante circular */}
      <div
        ref={dragRef}
        className={`
          fixed z-[9999] flex items-center justify-center
          rounded-full shadow-xl border bg-white
          cursor-pointer select-none
          active:scale-95 transition-transform
          animate-[pulse_2s_ease-in-out_infinite]
        `}
        style={{
          borderColor: "rgba(92,46,11,0.3)",
          width: "60px",
          height: "60px",
          ...(isMobile ? bubbleStyleMobile : bubbleStyleDesktop),
        }}
        onMouseDown={onMouseDownBubble}
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <img
          src={litisLogo}
          alt="LitisBot"
          className="w-11 h-11 object-contain"
          draggable={false}
        />
      </div>
    </>
  );
}
