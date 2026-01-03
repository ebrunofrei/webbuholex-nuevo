// ============================================================================
// 🦉 LitisBotChatPro — Enterprise Orchestrator (CANÓNICO)
// ----------------------------------------------------------------------------
// - Orquesta UI + Contextos + Análisis + Engine
// - Sidebar = hardware (callbacks)
// - Orquestador = lógica de sesión/persistencia
// ============================================================================

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Drawer from "@/components/ui/Drawer.jsx";

import NuevoCasoModal from "./modals/NuevoCasoModal.jsx";
import LitisBotToolsModal from "./LitisBotToolsModal.jsx";
import LitisBotControlCenter from "./chat/LitisBotControlCenter.jsx";

import {
  LitisBotCognitiveProvider,
  LITIS_MODE,
  LITIS_ROLES,
} from "@/components/litisbot/context/LitisBotCognitiveContext.jsx";

// UI BASE
import ChatLayout from "./layout/ChatLayout.jsx";
import ChatSidebar from "./chat/ChatSidebar.jsx";
import AnalysisWindow from "./chat/AnalysisWindow.jsx";
import AnalysisHeader from "./header/AnalysisHeader.jsx";
import ChatInputBar from "./chat/ChatInputBar.jsx";

// ENGINE
import LitisBotEngine from "./chat/ui/LitisBotEngine.jsx";

// Controllers
import { listCases, createCase } from "./controllers/caseController.js";

// Helpers análisis local
import {
  loadAnalyses,
  createAnalysis,
  renameAnalysis,
  archiveAnalysis,
  deleteAnalysis,
} from "./chat/helpers/analysisStore.js";

// ============================================================================
// 🔒 PERSISTENCIA LOCAL — CHAT
// ============================================================================

function getChatStorageKey({ usuarioId, caseId, chatId }) {
  if (!usuarioId || !caseId || !chatId) return null;
  return `litisbot:chat:${usuarioId}:${caseId}:${chatId}`;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function LitisBotChatPro({ user, pro = false }) {
  const navigate = useNavigate();
  const engineRef = useRef(null);

  const usuarioId = user?.uid || null;

  // =======================
  // ESTRUCTURA
  // =======================
  const [cases, setCases] = useState([]);
  const [caseIdActivo, setCaseIdActivo] = useState(null);

  // ⚠️ IMPORTANTE: ya NO se autogenera análisis
  const [analysisIdActivo, setAnalysisIdActivo] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);

  // 🔁 refrescar sidebar cuando cambie localStorage
  const [analysesVersion, setAnalysesVersion] = useState(0);
  const bumpAnalyses = useCallback(() => setAnalysesVersion((v) => v + 1), []);

  // =======================
  // MENSAJES
  // =======================
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const lastHydratedSessionRef = useRef(null);

  // =======================
  // INPUT / ADJUNTOS
  // =======================
  const [inputValue, setInputValue] = useState("");
  const [adjuntos, setAdjuntos] = useState([]);

  // =======================
  // CONTEXTOS EXTERNOS
  // =======================
  const [jurisContext, setJurisContext] = useState([]);
  const [researchContext, setResearchContext] = useState([]);

  // =======================
  // UI (HARDWARE)
  // =======================
  const [ui, setUI] = useState({
    sidebar: false,
    tools: false,
    control: false,
    user: false,
    newCase: false,
  });

  const openUI = useCallback((k) => setUI((u) => ({ ...u, [k]: true })), []);
  const closeUI = useCallback((k) => setUI((u) => ({ ...u, [k]: false })), []);

  // =======================
  // LABEL USUARIO
  // =======================
  const userLabel = useMemo(() => {
    return (
      user?.displayName ||
      user?.nombre ||
      (user?.email ? user.email.split("@")[0] : "Usuario")
    );
  }, [user]);

 // ========================================================================
// CARGA INICIAL DE CONTEXTOS (CANÓNICO)
// - NO crea contextos por defecto
// - NO crea análisis
// - SOLO limpia duplicados (UI-safe)
// ========================================================================
useEffect(() => {
  if (!usuarioId) return;

  (async () => {
    try {
      const data = await listCases(usuarioId);

      const raw = Array.isArray(data) ? data : [];

      // 1) Normaliza id
      const normalized = raw
        .filter(Boolean)
        .map((c) => ({
          ...c,
          id: c.id || c._id, // id canónico
        }))
        .filter((c) => c.id);

      // 2) Dedup por ID (si backend repite)
      const byId = new Map();
      for (const c of normalized) {
        if (!byId.has(c.id)) byId.set(c.id, c);
      }
      const unique = Array.from(byId.values());

      // 3) Normalización CANÓNICA del ROOT de análisis
      // - Conversación general → ROOT lógico
      // - El título deja de ser identificador
      // - Deduplicación por ROL, no por nombre

      const ROOT_ROLE = "__ROOT_ANALYSIS__";
      const ROOT_TITLE = "Mis estados de análisis";

      // Re-normalizar contextos
      const normalizedWithRoot = unique.map((c) => {
        const title = (c.title || "").trim();
        const isLegacyRoot = title === "Conversación general";
        const isRoot = c.role === ROOT_ROLE || isLegacyRoot;

        return {
          ...c,
          role: isRoot ? ROOT_ROLE : c.role,
          title: isRoot ? ROOT_TITLE : title,
        };
      });

      // Separar ROOT vs normales
      const roots = normalizedWithRoot.filter(
        (c) => c.role === ROOT_ROLE
      );

      const others = normalizedWithRoot.filter(
        (c) => c.role !== ROOT_ROLE
      );

      // Mantener SOLO un ROOT (el más reciente)
      let cleaned = [...others];

      if (roots.length > 0) {
        const keep = roots
          .slice()
          .sort((a, b) => {
            const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return db - da;
          })[0];

        cleaned.unshift(keep);
      }

      // 4) Estado vacío legítimo (CLAVE)
      if (cleaned.length === 0) {
        setCases([]);
        setCaseIdActivo(null);
        setAnalysisIdActivo(null);
        setChatSessionId(null);
        return;
      }

      // 5) Setear lista SIN forzar análisis
      setCases(cleaned);

      // ⚠️ SOLO setear activo si aún no hay uno
      setCaseIdActivo((prev) =>
        prev && cleaned.some((c) => c.id === prev)
          ? prev
          : cleaned[0].id
      );

      setAnalysisIdActivo(null);
      setChatSessionId(null);

    } catch (e) {
      console.error("Error cargando contextos:", e);
      setCases([]);
      setCaseIdActivo(null);
      setAnalysisIdActivo(null);
      setChatSessionId(null);
    }
  })();
}, [usuarioId]);


  // ========================================================================
  // 🔒 REHIDRATACIÓN LOCAL DEL CHAT (solo si hay chatSessionId)
  // ========================================================================
  useEffect(() => {
    if (!usuarioId || !caseIdActivo || !chatSessionId) {
      // Estado vacío canónico
      setMessages([]);
      setHydrated(false);
      lastHydratedSessionRef.current = null;
      return;
    }

    const key = getChatStorageKey({
      usuarioId,
      caseId: caseIdActivo,
      chatId: chatSessionId,
    });

    if (!key) return;

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMessages(Array.isArray(parsed) ? parsed : []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setHydrated(true);
      lastHydratedSessionRef.current = chatSessionId;
    }
  }, [usuarioId, caseIdActivo, chatSessionId]);

  // ========================================================================
  // 💾 AUTOGUARDADO LOCAL (solo si hay chatSessionId)
  // ========================================================================
  useEffect(() => {
    if (!usuarioId || !caseIdActivo || !chatSessionId) return;
    if (!hydrated) return;

    const key = getChatStorageKey({
      usuarioId,
      caseId: caseIdActivo,
      chatId: chatSessionId,
    });

    if (!key) return;

    try {
      localStorage.setItem(key, JSON.stringify(messages));
    } catch {}
  }, [messages, hydrated, usuarioId, caseIdActivo, chatSessionId]);

  // ========================================================================
  // 🧠 SELECCIÓN DE ANÁLISIS (desde sidebar)
  // ========================================================================
  const handleSelectAnalysis = useCallback(
    (analysisId) => {
      if (!analysisId || analysisId === analysisIdActivo) return;

      setAnalysisIdActivo(analysisId);
      setChatSessionId(analysisId);

      setMessages([]);
      setHydrated(false);
      lastHydratedSessionRef.current = null;
    },
    [analysisIdActivo]
  );

  // ========================================================================
  // 🧠 NUEVO ANÁLISIS (desde header o sidebar)
  // ========================================================================
  const handleNuevoChat = useCallback(() => {
    if (!usuarioId || !caseIdActivo) return;

    const { created } = createAnalysis({
      usuarioId,
      contextId: caseIdActivo,
      title: "",
    });

    bumpAnalyses();
    handleSelectAnalysis(created.id);
  }, [usuarioId, caseIdActivo, bumpAnalyses, handleSelectAnalysis]);

  // ========================================================================
  // ✅ HANDLERS CANÓNICOS: rename / archive / delete
  // ========================================================================

  const handleRenameAnalysis = useCallback(
    (analysisId, title) => {
      if (!usuarioId || !caseIdActivo || !analysisId) return;
      renameAnalysis({ usuarioId, contextId: caseIdActivo, analysisId, title });
      bumpAnalyses();
    },
    [usuarioId, caseIdActivo, bumpAnalyses]
  );

  const handleArchiveAnalysis = useCallback(
    (analysisId) => {
      if (!usuarioId || !caseIdActivo || !analysisId) return;
      archiveAnalysis({ usuarioId, contextId: caseIdActivo, analysisId });
      bumpAnalyses();

      // si archivaste el activo, lo soltamos (canónico)
      if (analysisId === analysisIdActivo) {
        setAnalysisIdActivo(null);
        setChatSessionId(null);
        setMessages([]);
        setHydrated(false);
        lastHydratedSessionRef.current = null;
      }
    },
    [usuarioId, caseIdActivo, bumpAnalyses, analysisIdActivo]
  );

  const handleDeleteAnalysis = useCallback(
    (analysisId) => {
      if (!usuarioId || !caseIdActivo || !analysisId) return;

      // 1) borrar chat persistido del hilo
      const chatKey = getChatStorageKey({
        usuarioId,
        caseId: caseIdActivo,
        chatId: analysisId,
      });
      if (chatKey) {
        try {
          localStorage.removeItem(chatKey);
        } catch {}
      }

      // 2) borrar el análisis (lista)
      deleteAnalysis({ usuarioId, contextId: caseIdActivo, analysisId });

      // 3) refrescar sidebar
      bumpAnalyses();

      // 4) si era el activo, limpiar selección + window
      if (analysisId === analysisIdActivo) {
        setAnalysisIdActivo(null);
        setChatSessionId(null);
        setMessages([]);
        setHydrated(false);
        lastHydratedSessionRef.current = null;
      }
    },
    [usuarioId, caseIdActivo, bumpAnalyses, analysisIdActivo]
  );

  // ========================================================================
  // ACCIONES COGNITIVAS (placeholder)
  // ========================================================================
  async function handleCognitiveAction(action) {
    if (!action?.type) return;
    // Router futuro canónico
  }

  // ========================================================================
  // SIDEBAR NODE (hardware + callbacks)
  // ========================================================================
  const sidebarNode = (
    <ChatSidebar
      contexts={cases}
      analyses={loadAnalyses({ usuarioId, contextId: caseIdActivo })}
      analysesVersion={analysesVersion}
      activeCaseId={caseIdActivo}
      activeAnalysisId={analysisIdActivo}
      userLabel={userLabel}
      onSelectCase={(id) => {
        setCaseIdActivo(id);
        closeUI("sidebar");

        // al cambiar de contexto, soltamos el análisis (NO autogenerar)
        setAnalysisIdActivo(null);
        setChatSessionId(null);
        setMessages([]);
        setHydrated(false);
        lastHydratedSessionRef.current = null;
      }}
      onSelectAnalysis={(id) => {
        handleSelectAnalysis(id);
        closeUI("sidebar");
      }}
      onNuevoAnalisis={() => {
        handleNuevoChat();
        closeUI("sidebar");
      }}
      onRenameAnalysis={handleRenameAnalysis}
      onArchiveAnalysis={handleArchiveAnalysis}
      onDeleteAnalysis={handleDeleteAnalysis}
      onOpenNuevoCaso={() => openUI("newCase")}
      onGoHome={() => navigate("/")}
      onGoOffice={() => navigate("/oficina")}
      onOpenControlCenter={() => openUI("control")}
      onLogout={() => {
        /* logout */
      }}
    />
  );

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <LitisBotCognitiveProvider
      initialMode={LITIS_MODE.LITIGANTE}
      initialRole={LITIS_ROLES.LITIGANTE}
    >
      <ChatLayout
        sidebar={sidebarNode}
        header={
          <AnalysisHeader
            onOpenSidebar={() => openUI("sidebar")}
            onNuevoChat={handleNuevoChat}
            onOpenControlCenter={() => openUI("control")}
          />
        }
        window={
          <AnalysisWindow
            messages={messages}
            loading={loadingHistory}
            activeCaseId={caseIdActivo}
            activeChatId={chatSessionId}
            onCognitiveAction={handleCognitiveAction}
          />
        }
        input={
          <ChatInputBar
            value={inputValue}
            onChange={setInputValue}
            adjuntos={adjuntos}
            onOpenTools={() => openUI("tools")}
            onAttachFiles={(files) =>
              setAdjuntos((p) => [
                ...p,
                ...files.map((f) => ({ file: f, name: f.name })),
              ])
            }
            onRemoveAdjunto={(i) =>
              setAdjuntos((p) => p.filter((_, idx) => idx !== i))
            }
            onSend={async (texto, normAdjuntos) => {
              if (!engineRef.current) return;

              // si no hay análisis activo, no enviamos: primero crea un hilo
              if (!chatSessionId) {
                // aquí luego metemos un toast bonito (por ahora, return seco)
                return;
              }

              const userMsg = {
                id: `u-${Date.now()}`,
                role: "user",
                content: texto || "Adjunto documentos.",
                meta: { adjuntos: normAdjuntos },
                createdAt: new Date().toISOString(),
              };

              setMessages((prev) => [...prev, userMsg]);

              const placeholderId = `ph-${Date.now()}`;
              setMessages((prev) => [
                ...prev,
                { id: placeholderId, role: "assistant", _placeholder: true },
              ]);

              setInputValue("");
              setAdjuntos([]);

              const res = await engineRef.current.enviarMensaje(
                texto,
                normAdjuntos
              );

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId
                    ? res?.ok
                      ? res.assistantMessage
                      : {
                          id: `err-${Date.now()}`,
                          role: "assistant",
                          content: res?.error || "Error inesperado",
                        }
                    : m
                )
              );
            }}
          />
        }
        overlays={
          <>
            <Drawer
              open={ui.sidebar}
              side="left"
              onClose={() => closeUI("sidebar")}
            >
              {sidebarNode}
            </Drawer>

            {ui.newCase && (
              <NuevoCasoModal
                open={ui.newCase}
                onClose={() => closeUI("newCase")}
                onCreated={(newContexto) => {
                  const ctxId = newContexto?.id || newContexto?._id;
                  if (ctxId) setCaseIdActivo(ctxId);

                  setAnalysisIdActivo(null);
                  setChatSessionId(null);
                  setMessages([]);
                  setHydrated(false);
                  lastHydratedSessionRef.current = null;

                  closeUI("newCase");
                }}
              />
            )}

            <LitisBotToolsModal open={ui.tools} onClose={() => closeUI("tools")} />

            <Drawer
              open={ui.control}
              side="right"
              onClose={() => closeUI("control")}
            >
              <LitisBotControlCenter open onClose={() => closeUI("control")} />
            </Drawer>

            <Drawer open={ui.user} side="right" onClose={() => closeUI("user")}>
              <div className="p-4">
                <div className="text-[16px] font-semibold">Usuario</div>
                <div className="opacity-70 text-[14px] mt-1">
                  (Hardware listo) Aquí va el minimodal real.
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    className="px-3 py-2 rounded bg-black/5 hover:bg-black/10"
                    onClick={() => closeUI("user")}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </Drawer>
          </>
        }
      />

      <LitisBotEngine
        ref={engineRef}
        usuarioId={usuarioId}
        caseId={caseIdActivo}
        chatIdActivo={chatSessionId}
        mensajes={messages}
        onChangeMensajes={setMessages}
        jurisSeleccionada={jurisContext}
        pro={pro}
      />
    </LitisBotCognitiveProvider>
  );
}
