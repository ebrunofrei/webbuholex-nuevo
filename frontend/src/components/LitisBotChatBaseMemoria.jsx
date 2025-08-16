import React, { useState, useRef } from "react";

export default function LitisBotChatBase({ user }) {
    const [mensajes, setMensajes] = useState([
        {
            role: "assistant",
            content:
                "👨‍⚖️ Bienvenido a LitisBot. Puedes hacer tus consultas legales y seguiré aprendiendo sobre tus preferencias para ayudarte mejor cada vez."
        }
    ]);
    const [input, setInput] = useState("");
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const chatRef = useRef(null);

    // Memoria: guarda la conversación anterior del usuario
    const historial = mensajes
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
            role: m.role,
            content: m.content
        }));

    const handleConsultaLegal = async () => {
        if (!input.trim()) return;
        setCargando(true);
        setError(null);

        const nuevoMensaje = {
            role: "user",
            content: input
        };
        setMensajes((msgs) => [...msgs, nuevoMensaje]);

        try {
            // Llama a tu backend que maneja la memoria/contexto
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/ia-litisbotchat`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: input,
                        historial,
                        userId: user?.uid || "invitado"
                    })
                }
            );
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error desconocido del servidor");
            }
            const data = await res.json();
            const respuesta = data.respuesta || "No se pudo obtener respuesta del asistente legal.";
            setMensajes((msgs) => [
                ...msgs,
                { role: "assistant", content: respuesta }
            ]);
        } catch (err) {
            setMensajes((msgs) => [
                ...msgs,
                {
                    role: "assistant",
                    content: "❌ Hubo un error consultando al asistente legal. Intenta nuevamente más tarde."
                }
            ]);
            setError(err.message);
        } finally {
            setCargando(false);
            setInput("");
            setTimeout(() => {
                if (chatRef.current) {
                    chatRef.current.scrollTop = chatRef.current.scrollHeight;
                }
            }, 200);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleConsultaLegal();
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[90vh]">
            <div
                ref={chatRef}
                className="flex-1 overflow-y-auto p-4 bg-[#FFF8F3] rounded-xl"
                style={{ minHeight: 300, maxHeight: "70vh" }}
            >
                {mensajes.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`my-2 p-3 rounded-xl ${
                            msg.role === "user"
                                ? "bg-yellow-50 text-right ml-24"
                                : "bg-amber-100 text-left mr-24"
                        }`}
                    >
                        <span>{msg.content}</span>
                    </div>
                ))}
                {cargando && (
                    <div className="my-2 text-amber-600">LitisBot está escribiendo...</div>
                )}
            </div>
            <div className="flex items-center border-t p-2">
                <textarea
                    className="flex-1 resize-none rounded-xl border p-2 mr-2"
                    rows={2}
                    placeholder="Escribe o pega tu pregunta legal aquí..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    disabled={cargando}
                />
                <button
                    onClick={handleConsultaLegal}
                    disabled={cargando || !input.trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-5 py-2 font-bold shadow"
                >
                    {cargando ? "..." : "Enviar"}
                </button>
            </div>
            {error && (
                <div className="p-2 text-red-500 text-center">{error}</div>
            )}
        </div>
    );
}
