import { useRef } from "react";
import { MdSend, MdAttachFile } from "react-icons/md";
import { useGeneralChatContext } from "./GeneralChatProvider";

export default function GeneralChatInput() {
  const {
    draft,
    setDraft,
    dispatchMessage,
    isDispatching,
  } = useGeneralChatContext();

  // 🛡️ IME / Mobile composition guard
  const isComposingRef = useRef(false);

  // 🚫 NUNCA bloquear por draft en móvil (IME bug)
  const disabled = isDispatching;

  return (
    <div className="bg-white border-t border-slate-100 px-6 py-6 transition-all duration-300">
      <div className="mx-auto w-full max-w-4xl">
        <div
          className={`
            flex items-end gap-3 rounded-2xl border px-4 py-3.5
            transition-all duration-300 ease-in-out
            ${
              disabled
                ? "bg-slate-50 border-slate-200"
                : "bg-white border-slate-300 shadow-xl shadow-slate-100/50 focus-within:border-slate-900"
            }
          `}
        >
          {/* BOTÓN TÁCTICO: ADJUNTOS (NO BLOQUEANTE) */}
          <button
            type="button"
            className="text-slate-400 shrink-0 p-1 hover:text-slate-900 transition-colors"
            tabIndex={-1}
            title="Adjuntar documentación jurídica (Próximamente)"
          >
            <MdAttachFile size={22} />
          </button>

          {/* ÁREA DE ESCRITURA */}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              setDraft(e.target.value);
            }}
            enterKeyHint="send"
            placeholder="Introduce los hechos o fundamentos de tu consulta jurídica..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[16px] leading-relaxed outline-none text-slate-800"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !isComposingRef.current
              ) {
                e.preventDefault();
                dispatchMessage();
              }
            }}
          />

          {/* ACCIÓN: ENVIAR */}
          <button
            type="button"
            onClick={dispatchMessage}
            disabled={disabled}
            className="
              h-12 w-12 shrink-0 flex items-center justify-center
              rounded-xl bg-slate-900 text-white transition-all
              shadow-lg shadow-slate-200
              hover:bg-black hover:scale-105 active:scale-95
              disabled:opacity-10 disabled:scale-100 disabled:shadow-none
            "
          >
            <MdSend size={24} />
          </button>
        </div>

        {/* METADATOS DE CANAL */}
        <div className="flex justify-between items-center px-4 mt-4">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
            BúhoLex LegalTech 2026
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Canal Home Chat · Protocolo R7.7
          </span>
        </div>
      </div>
    </div>
  );
}
