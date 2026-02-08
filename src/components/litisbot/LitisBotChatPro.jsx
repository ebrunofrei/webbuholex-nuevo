// ============================================================================
// 🦉 LitisBotChatPro — Enterprise Orchestrator (CANÓNICO)
// ----------------------------------------------------------------------------
// - Orquesta UI + Contextos + Análisis + Engine
// - Sidebar = hardware (callbacks)
// - Orquestador = lógica de sesión/persistencia
// ============================================================================

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildAutoAnalysisTitle } from "@/utils/autoAnalysisTitle";
import { createAgendaEvento } from "@/services/agendaEventosMongoService";

import Drawer from "@/components/ui/Drawer.jsx";
import OCRPanel from "@/components/Herramientas/panels/OCRPanel.jsx";
import HerramientaMultilingue from "@/components/Herramientas/HerramientaMultilingue.jsx";
import TranscriptorForense from "@/components/Herramientas/TranscriptorForense.jsx";

import NuevoCasoModal from "./modals/NuevoCasoModal.jsx";
import LitisBotToolsModal from "./LitisBotToolsModal.jsx";
import LitisBotControlCenter from "./chat/LitisBotControlCenter.jsx";
import AccountMiniModal from "./chat/sidebar/AccountMiniModal.jsx";

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
import { buildAutoTitle } from "./chat/helpers/autoTitle.js";

import {
  listAnalyses as listAnalysesAPI,
  createAnalysisAPI,
  renameAnalysisAPI,
  deleteAnalysisAPI,
} from "@/services/analysisService.js";

// ============================================================================
// 🔒 PERSISTENCIA LOCAL — CHAT
// ============================================================================

function getChatStorageKey({ usuarioId, caseId, chatId }) {
  if (!usuarioId || !caseId || !chatId) return null;
  return `litisbot:chat:${usuarioId}:${caseId}:${chatId}`;
}

// ========================================================
// 🧠 AUTOTÍTULO DE ANÁLISIS (heurística ligera)
// - No IA
// - No backend
// - Determinista y editable por el usuario
// ========================================================
function deriveAnalysisTitleFromText(text = "") {
  if (!text) return "Análisis jurídico";

  // Limpieza básica
  const clean = text
    .replace(/\s+/g, " ")
    .replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ\s]/g, "")
    .trim();

  if (!clean) return "Análisis jurídico";

  // Cortar a frase razonable
  const maxLength = 60;

  // Preferir frases tipo: "Analizar X", "Sobre X", "Análisis de X"
  const lowered = clean.toLowerCase();

  let title = clean;

  const patterns = [
    /^analizar\s+/i,
    /^análisis\s+de\s+/i,
    /^sobre\s+/i,
    /^estudio\s+de\s+/i,
  ];

  for (const p of patterns) {
    if (p.test(clean)) {
      title = clean.replace(p, "");
      break;
    }
  }

  // Capitalizar
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Recortar longitud
  if (title.length > maxLength) {
    title = title.slice(0, maxLength).trim() + "…";
  }

  return title || "Análisis jurídico";
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function LitisBotChatPro({ user, pro = false }) {
  const navigate = useNavigate();
  const engineRef = useRef(null);
  const usuarioId = user?.uid || null;

  // ESTRUCTURA DE SESIÓN
  const [cases, setCases] = useState([]);
  const [caseIdActivo, setCaseIdActivo] = useState(null);
  const [analysisIdActivo, setAnalysisIdActivo] = useState(null);
  
  // setter canónico corregido
  const [chatSessionId, setChatSessionId] = useState(null);

  const analysisBornFromDraftRef = useRef(false);
  const [analysesVersion, setAnalysesVersion] = useState(0);
  const bumpAnalyses = useCallback(() => setAnalysesVersion((v) => v + 1), []);

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const lastHydratedSessionRef = useRef(null);

  const [inputValue, setInputValue] = useState("");
  const [adjuntos, setAdjuntos] = useState([]);
  const [draftSessionId] = useState(() => crypto.randomUUID());

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
    account: false,
    newCase: false,
  });

  // =======================
  // INTÉRPRETE (UI MODE)
  // =======================
  const [interpreterMode, setInterpreterMode] = useState(false);

  // Mobile detector (reactivo)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // =======================
  // HERRAMIENTAS (OVERLAY)
  // =======================
  const openUI = useCallback((k) => setUI((u) => ({ ...u, [k]: true })), []);
  const closeUI = useCallback((k) => setUI((u) => ({ ...u, [k]: false })), []);
  const openAccount = () =>
  setUI((u) => ({ ...u, account: true }));

  const closeAccount = () =>
  setUI((u) => ({ ...u, account: false }));

  const [activeTool, setActiveTool] = useState(null);

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

  // ========================================================
  // 🔁 CAMBIO DE SESIÓN (EVENTO CANÓNICO)
  // - El análisis ES la sesión
  // - Distingue: nacimiento vs selección
  // ========================================================
  useEffect(() => {
  if (!analysisIdActivo) {
    setMessages([]);
    setHydrated(false);
    lastHydratedSessionRef.current = null;
    return;
  }

  // 🛡️ SI el análisis nació desde el draft, NO reseteamos
  if (analysisBornFromDraftRef.current) {
    analysisBornFromDraftRef.current = false; // consumir flag
    return;
  }

  // 🔁 Cambio manual de análisis → reset legítimo
  setMessages([]);
  setHydrated(false);
  lastHydratedSessionRef.current = null;
}, [analysisIdActivo]);

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
          const ROOT_CONTEXT = {
            id: "__ROOT__",
            role: "__ROOT_ANALYSIS__",
            title: "Hablemos",
            createdAt: new Date().toISOString(),
          };

          setCases([ROOT_CONTEXT]);
          setCaseIdActivo(ROOT_CONTEXT.id);
          setAnalysisIdActivo(null);
          setChatSessionId(null);

          // 🧠 Nueva sesión general (ROOT)
          setChatSessionId(crypto.randomUUID());

          setMessages([]);
          setHydrated(false);
          lastHydratedSessionRef.current = null;
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

        // 🧠 Nueva sesión general (ROOT)
        setChatSessionId(crypto.randomUUID());

        setMessages([]);
        setHydrated(false);
        lastHydratedSessionRef.current = null;

      } catch (e) {
        console.error("Error cargando contextos:", e);
        setCases([]);
        setCaseIdActivo(null);
        setAnalysisIdActivo(null);
        setChatSessionId(null);
      }
    })();
  }, [usuarioId]);

  // ========================================================
  // 🔁 SYNC CANÓNICO (COMPAT)
  // Garantiza que chatSessionId siga a analysisIdActivo
  // sin borrar hilos ni romper renders intermedios.
  // ========================================================
  useEffect(() => {
    // si no hay análisis, también soltamos sesión
    if (!analysisIdActivo) {
      if (chatSessionId !== null) setChatSessionId(null);
      return;
    }

    // si se desalinean, corregimos
    if (chatSessionId !== analysisIdActivo) {
      setChatSessionId(analysisIdActivo);
    }
  }, [analysisIdActivo, chatSessionId]);

  // ========================================================================
  // 🔒 REHIDRATACIÓN LOCAL DEL CHAT (CANÓNICA, NO DESTRUCTIVA)
  // - Nunca borra hilos
  // - Solo hidrata cuando hay sesión válida
  // ========================================================================
  useEffect(() => {
    if (!usuarioId || !caseIdActivo || !chatSessionId) {
      // ⚠️ IMPORTANTE:
      // NO limpiar mensajes aquí.
      // El reset de UI ocurre SOLO en cambio explícito de análisis/contexto.
      return;
    }

    // Evitar rehidratar dos veces la misma sesión
    if (lastHydratedSessionRef.current === chatSessionId) {
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
  // ========================================================
  // 🔄 HIDRATACIÓN BACKEND → STORE LOCAL (CANÓNICA)
  // ========================================================
  useEffect(() => {
    // 🛡️ Filtro de integridad: No pedir análisis si el ID es "__ROOT__"
    if (!user || !usuarioId || !caseIdActivo || caseIdActivo === "__ROOT__") return;

    (async () => {
      try {
        const backendAnalyses = await listAnalysesAPI({
          user,
          caseId: caseIdActivo,
        });

        if (cancelled || !Array.isArray(backendAnalyses)) return;

        const local = loadAnalyses({
          usuarioId,
          contextId: caseIdActivo,
        });

        const localById = new Map(local.map(a => [a.id, a]));
        const merged = [...local];

        for (const a of backendAnalyses) {
          if (!localById.has(a._id)) {
            merged.push({
              id: a._id,
              contextId: caseIdActivo,
              title: a.title,
              createdAt: a.createdAt,
              archivedAt: a.status === "archivado" ? a.updatedAt : null,
              _source: "backend",
            });
          }
        }

        // Guardar solo si hay cambios
        if (merged.length !== local.length) {
          localStorage.setItem(
            `litisbot:analyses:${usuarioId}:${caseIdActivo}`,
            JSON.stringify(merged)
          );
          bumpAnalyses();
        }
      } catch (err) {
        console.warn("⚠️ Modo local activo para este contexto");
      }
    })();

    
  }, [user, usuarioId, caseIdActivo]);

  // ========================================================
  // 🔧 TOOLS → OVERLAYS (CANÓNICO)
  // - Tools solo disparan eventos
  // - ChatPro decide UX y restricciones
  // ========================================================
  useEffect(() => {
    const handler = (e) => {
      const { tool } = e.detail || {};
      if (!tool) return;

      // 🗣️ Multilingüe jurídico (SOLO MOBILE)
      if (tool === "multilingue_juridico") {
        if (!isMobile) {
          // 🔔 Toast global — bloqueo por plataforma
          window.dispatchEvent(
            new CustomEvent("litisbot:toast", {
              detail: {
                message: "Disponible solo en móvil",
                type: "info",
                duration: 2500,
              },
            })
          );
          return;
        }
      // 🎙️ Transcriptor Forense (audio / video → texto crudo)
      if (tool === "transcriptor_forense") {
        setActiveTool("transcriptor_forense");
        return;
      }

        // 📱 Mobile → activar intérprete
        setInterpreterMode(true);
        setActiveTool(null);
        return;
      }

      // 🧰 Otros tools → overlays normales
      setActiveTool(tool);
    };

    window.addEventListener("litisbot:tool", handler);
    return () => window.removeEventListener("litisbot:tool", handler);
  }, [isMobile]);

    // ========================================================
    // 📥 OCR → INSERTAR TEXTO EN CHAT (CANÓNICO)
    // ========================================================
    useEffect(() => {
      const handler = (e) => {
        const { text, filename } = e.detail || {};
        if (!text) return;

        // Insertamos como mensaje de usuario (no asistente)
        const msg = {
          id: `ocr-${Date.now()}`,
          role: "user",
          content: `📄 Texto extraído por OCR (${filename || "documento"}):\n\n${text}`,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, msg]);

        // Cerrar OCR si estaba abierto
        setActiveTool(null);
      };

      window.addEventListener("litisbot:ocr", handler);
      return () => window.removeEventListener("litisbot:ocr", handler);
    }, []);

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

    // 1) activar análisis
    setAnalysisIdActivo(analysisId);

    // 2) compat: sesión se setea aquí (y el effect la mantiene alineada)
    setChatSessionId(analysisId);

    // 3) limpiar window antes de rehidratar
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
    if (!usuarioId) return;

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

        // 🧠 Nueva sesión general (ROOT)
        setChatSessionId(crypto.randomUUID());

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

        // 🧠 Nueva sesión general (ROOT)
        setChatSessionId(crypto.randomUUID());

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

  // ========================================================
  // 🗓️ AGENDA ↔ CHAT (CANÓNICO)
  // ========================================================
  const handleAgendaAction = useCallback(
  async ({ type, draft, msgId }) => {
    if (!msgId || (type !== "confirm" && type !== "cancel")) return;

    // ❌ CANCELAR
    if (type === "cancel") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                meta: { ...m.meta, agendaDraft: null },
                content: "Evento descartado.",
              }
            : m
        )
      );
      return;
    }

    // ✅ CONFIRMAR
    if (type === "confirm" && draft) {
      try {
        const saved = await createAgendaEvento({
          usuarioId,
          sessionId: chatSessionId || null,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,

          title: draft.title,
          startISO: draft.startISO,
          endISO: draft.endISO || draft.startISO,
          notes: draft.notes || "",
          telefono: draft.telefono || "",
          alertaWhatsapp: !!draft.alertaWhatsapp,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  content: "📅 Evento agendado correctamente ✅",
                  meta: { ...m.meta, agendaMeta: saved },
                }
              : m
          )
        );

        window.dispatchEvent(
          new CustomEvent("agenda:refresh", {
            detail: {
              intent: "agenda.create",
              source: "chat",
              payload: saved,
            },
          })
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: "No pude agendar el evento. ¿Reintento?" }
              : m
          )
        );
      }
    }
  },
  [usuarioId, chatSessionId]
);

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

        // 🧠 Nueva sesión general (ROOT)
        setChatSessionId(crypto.randomUUID());

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
      onOpenAccount={() => openUI("account")}
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
      {/* ============================================================
          📱 MODO INTÉRPRETE — MOBILE (REEMPLAZA TODO EL CHAT)
          - El chat se oculta.
          - Solo se ve el panel de interpretación.
      ============================================================ */}
      {interpreterMode && isMobile ? (
        <div className="fixed inset-0 z-[9998] bg-white dark:bg-black">
          <HerramientaMultilingue
            caseId={caseIdActivo}
            onClose={() => setInterpreterMode(false)}
          />
        </div>
      ) : (
        <>
          {/* ========================================================
              💬 CHAT NORMAL
          ======================================================== */}
          <ChatLayout
            sidebar={sidebarNode}
            header={
              <AnalysisHeader
                onOpenSidebar={() => openUI("sidebar")}
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
                onAgendaAction={handleAgendaAction}
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

                  // ========================================================
                  // 🗓️ INTERCEPTOR DE CONFIRMACIÓN AGENDA (CANÓNICO)
                  // ========================================================
                  const normalized = (texto || "").trim().toLowerCase();
                  const YES = ["si", "sí", "ok", "dale", "confirmo", "confirmar", "confirmado"];
                  const NO  = ["no", "cancela", "cancelar", "descartar"];

                  const lastAgendaDraft = [...messages]
                    .reverse()
                    .find(
                      (m) =>
                        m.role === "assistant" &&
                        m.meta?.agendaDraft
                    );

                  if (lastAgendaDraft && (YES.includes(normalized) || NO.includes(normalized))) {
                    await handleAgendaAction({
                      type: YES.includes(normalized) ? "confirm" : "cancel",
                      draft: lastAgendaDraft.meta.agendaDraft,
                      msgId: lastAgendaDraft.id,
                    });

                    // Registrar el "sí/no" como mensaje del usuario (opcional pero prolijo)
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `u-${Date.now()}`,
                        role: "user",
                        content: texto,
                        createdAt: new Date().toISOString(),
                      },
                    ]);

                    setInputValue("");
                    setAdjuntos([]);
                    return; // 🔥 CLAVE: NO engine
                  }

                  const now = Date.now();

                  // ========================================================
                  // 1) MENSAJE DE USUARIO
                  // ========================================================
                  const userMsg = {
                    id: `u-${now}`,
                    role: "user",
                    content: texto || "Adjunto documentos.",
                    createdAt: new Date().toISOString(),
                  };

                  const placeholderId = `ph-${now}`;

                  setMessages((prev) => [
                    ...prev,
                    userMsg,
                    { id: placeholderId, role: "assistant", _placeholder: true },
                  ]);

                  setInputValue("");
                  setAdjuntos([]);

                    // ========================================================
                    // 2) RESPUESTA DEL ENGINE (PURO)
                    // ========================================================
                    // ⛔ GATE CANÓNICO
                    if (!analysisIdActivo) {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `sys-${Date.now()}`,
                          role: "assistant",
                          content:
                            "Cuando quieras, puedo ayudarte a crear un análisis jurídico a partir de esta conversación.",
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                    }

                    // ✅ SOLO SI HAY analysisIdActivo
                    const res = await engineRef.current.enviarMensaje(
                      texto,
                      normAdjuntos,
                      {
                        sessionId: analysisIdActivo || draftSessionId,
                      }
                    );

                    // ========================================================
                    // 🔔 ACCIONES POR INTENT (CANÓNICO)
                    // ========================================================
                    if (res?.intent === "agenda.create" && res?.payload) {
                      await createAgendaEvento({
                        usuarioId,
                        ...res.payload,
                      });
                    }

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

                  // ========================================================
                  // 3) NACIMIENTO DEL ANÁLISIS (POST-CONVERSACIÓN)
                  // ========================================================
                  if (
                      !analysisIdActivo &&
                      res?.ok &&
                      res?.intent === "analysis.start"
                    ) {

                    if (analysisBornFromDraftRef.current) return;

                    analysisBornFromDraftRef.current = true;

                    const seedText = userMsg?.content || texto || "";
                    const autoTitle = buildAutoAnalysisTitle(seedText);

                    const { created } = createAnalysis({
                      usuarioId,
                      contextId: caseIdActivo,
                      title: autoTitle,
                    });

                    setAnalysisIdActivo(created.id);
                    setChatSessionId(created.id);

                    // 🔁 Migración CANÓNICA de sesión → análisis
                    setChatSessionId(created.id);

                    lastHydratedSessionRef.current = created.id;
                    setHydrated(true);

                    bumpAnalyses();

                  }
                }}
              />
            }
            overlays={
              <>
                {/* ======================================================
                    SIDEBAR (MOBILE)
                ====================================================== */}
                <Drawer
                  open={ui.sidebar}
                  side="left"
                  onClose={() => closeUI("sidebar")}
                >
                  {sidebarNode}
                </Drawer>

                {/* ======================================================
                    NUEVO CASO
                ====================================================== */}
                {ui.newCase && (
                  <NuevoCasoModal
                    open
                    onClose={() => closeUI("newCase")}
                    onCreated={(newContexto) => {
                      const ctxId = newContexto?.id || newContexto?._id;
                      if (ctxId) setCaseIdActivo(ctxId);

                      setAnalysisIdActivo(null);
                      setChatSessionId(null);

                      // 🧠 Nueva sesión general (ROOT)
                      setChatSessionId(crypto.randomUUID());

                      setMessages([]);
                      setHydrated(false);
                      lastHydratedSessionRef.current = null;

                      closeUI("newCase");
                    }}
                  />
                )}

                {/* ======================================================
                    TOOLS
                ====================================================== */}
                <LitisBotToolsModal
                  open={ui.tools}
                  onClose={() => closeUI("tools")}
                />

                {/* ======================================================
                    OCR JURÍDICO (OVERLAY)
                ====================================================== */}
                {activeTool === "ocr_juridico" && (
                  <OCRPanel
                    open
                    onClose={() => setActiveTool(null)}
                  />
                )}

                {/* ======================================================
                    TRANSCRIPTOR FORENSE (OVERLAY)
                ====================================================== */}
                {activeTool === "transcriptor_forense" && (
                  <TranscriptorForense
                    onClose={() => setActiveTool(null)}
                  />
                )}

                {/* ======================================================
                    CONTROL CENTER
                ====================================================== */}
                <Drawer
                  open={ui.control}
                  side="right"
                  onClose={() => closeUI("control")}
                >
                  <LitisBotControlCenter
                    open
                    onClose={() => closeUI("control")}
                  />
                </Drawer>

                {/* ======================================================
                    CUENTA (MINI MODAL)
                ====================================================== */}
                <AccountMiniModal
                  open={ui.account}
                  onClose={() => closeUI("account")}
                />
              </>
            }
          />
        </>
      )}

      {/* ============================================================
          🤖 ENGINE PURO (NO SE TOCA)
      ============================================================ */}
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
