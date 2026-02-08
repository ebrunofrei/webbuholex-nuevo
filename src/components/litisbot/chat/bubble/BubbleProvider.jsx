import { useState, useCallback, useEffect, useRef } from "react";

import BubbleLauncher from "./BubbleLauncher";
import BubbleChatLayout from "./BubbleChatLayout";

import { getOrCreateBubbleSessionId } from "./utils/bubbleSession";
import { sendBubbleMessage } from "./services/sendBubbleMessage";
import { processPdfJurisContext } from "./services/pdfJurisService";

/**
 * ============================================================================
 * LITIS | Bubble Provider — R7.7++ CANONICAL
 * ----------------------------------------------------------------------------
 * - Conversation ALWAYS continues
 * - Unlock is backend-authoritative
 * - No fake unlocks
 * - sessionNote only when backend sends it
 * ============================================================================
 */
export default function BubbleProvider({
  usuarioId,
  pro = false,
  jurisSeleccionada = null,
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pdfCtx, setPdfCtx] = useState(null);

  // Session-level notice (badge)
  const [sessionNote, setSessionNote] = useState(null);

  // UX premium (countdown, optional)
  const [unlockExpiresIn, setUnlockExpiresIn] = useState(null);

 const sessionIdRef = useRef(getOrCreateBubbleSessionId());
const lastJurisIdRef = useRef(null);

const handleOpen = useCallback(() => setOpen(true), []);
const handleClose = useCallback(() => setOpen(false), []);

/* ======================================================
   🧠 BODY SCROLL LOCK (MOBILE / TABLET CANONICAL)
   - Evita que el body se mueva
   - Solo scrollea el bubble
====================================================== */
useEffect(() => {
  if (!open) return;

  const previousOverflow = document.body.style.overflow;
  const previousTouchAction = document.body.style.touchAction;

  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";

  return () => {
    document.body.style.overflow = previousOverflow || "";
    document.body.style.touchAction = previousTouchAction || "";
  };
}, [open]);


  /* ======================================================
   💳 CULQI PAYMENT → BACKEND UNLOCK (CANONICAL)
   ====================================================== */
const handlePaymentToken = useCallback(async (culqiToken) => {
  if (!culqiToken) return;

  try {
    const res = await fetch("/api/ia/unlock-analysis", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: culqiToken, // 🔑 Culqi token
      }),
    });

    const data = await res.json();

    if (!data?.ok) {
      throw new Error(data?.error || "unlock_failed");
    }

    // 1️⃣ El backend manda la verdad
    setSessionNote(null);

    // 2️⃣ UX premium: countdown real
    if (data.activeUntil) {
      setUnlockExpiresIn(
        Math.max(
          0,
          new Date(data.activeUntil).getTime() - Date.now()
        )
      );
    }

    // 3️⃣ Confirmación humana (NO sistema)
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Pago confirmado. Durante las próximas 24 horas puedo realizar análisis jurídico avanzado sin límites.",
      },
    ]);
  } catch (err) {
    console.error("❌ Unlock failed:", err);

    // UX nunca se rompe
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "El pago no pudo completarse. Puedes seguir conversando normalmente.",
      },
    ]);
  }
}, []);

  /* ======================================================
     💬 SEND MESSAGE — Bubble ALWAYS converses
     ====================================================== */
  const handleSend = useCallback(
    async (text, attachedFile = null) => {
      if ((!text?.trim() && !attachedFile) || loading) return;

      const displayMessage = text?.trim()
        ? text
        : "Analiza el documento adjunto";

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: displayMessage,
          fileName: attachedFile ? attachedFile.name : null,
        },
      ]);

      setLoading(true);

      try {
        let currentPdfCtx = pdfCtx;

        if (attachedFile) {
          currentPdfCtx = await processPdfJurisContext(attachedFile);
          setPdfCtx(currentPdfCtx);
        }

        const result = await sendBubbleMessage({
          texto: displayMessage,
          usuarioId,
          sessionId: sessionIdRef.current,
          jurisSeleccionada,
          pdfCtx: currentPdfCtx,
          isPro: pro,
        });

        // Assistant reply (ALWAYS)
        if (result?.respuesta) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: result.respuesta },
          ]);
        }

        // Session note (ONLY if backend sends it)
        setSessionNote(result?.sessionNote || null);

        // Optional unlock expiry refresh
        if (result?.activeUntil) {
          setUnlockExpiresIn(
            Math.max(
              0,
              new Date(result.activeUntil).getTime() - Date.now()
            )
          );
        }
      } catch (err) {
        console.error("❌ BubbleProvider Error:", err);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Ocurrió un problema técnico momentáneo. ¿Continuamos?",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [usuarioId, jurisSeleccionada, pdfCtx, pro, loading]
  );

  /* ======================================================
     📚 Jurisprudence sync
     ====================================================== */
  useEffect(() => {
    if (!jurisSeleccionada) return;

    const currentId =
      jurisSeleccionada._id ||
      jurisSeleccionada.id ||
      jurisSeleccionada.numeroExpediente ||
      null;

    if (!currentId || lastJurisIdRef.current !== currentId) {
      lastJurisIdRef.current = currentId;
      setOpen(true);
    }
  }, [jurisSeleccionada]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
      <div className="pointer-events-auto">
        <BubbleLauncher onOpen={handleOpen} isOpen={open} />
      </div>

      {open && (
        <div
            className="
            pointer-events-auto
            animate-in fade-in slide-in-from-bottom-10 duration-500

            /* MOBILE / TABLET */
            fixed inset-0 z-[9999]

            /* DESKTOP */
            sm:absolute sm:inset-auto sm:bottom-0 sm:right-0
            "
        >
        
          <BubbleChatLayout
            messages={messages}
            loading={loading}
            onSend={handleSend}
            onClose={handleClose}
            sessionNote={sessionNote}
            unlockExpiresIn={unlockExpiresIn}
            onPaymentToken={handlePaymentToken}
            />
        </div>
      )}
    </div>
  );
}
