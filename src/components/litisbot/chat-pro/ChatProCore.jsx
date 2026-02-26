import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
  LitisBotCognitiveProvider,
  LITIS_MODE,
  LITIS_ROLES,
} from "@/components/litisbot/context/LitisBotCognitiveContext.jsx";

import CourtReviewPanel from "@/components/litisbot/chat/ui/CourtReviewPanel.jsx";
import { processLegalText } from "@/services/legalProcessService.js";

import ChatShell from "./layout/ChatShell.jsx";
import AnalysisWindow from "../chat/AnalysisWindow.jsx";
import AnalysisHeader from "../header/AnalysisHeader.jsx";
import ChatInputBar from "../chat/ChatInputBar.jsx";
import LitisBotEngine from "../chat/ui/LitisBotEngine.jsx";

import { createAgendaEvento } from "@/services/agendaEventosMongoService";
import { buildAutoAnalysisTitle } from "@/utils/autoAnalysisTitle";

import useChatSession from "./hooks/useChatSession";
import useChatPersistence from "./hooks/useChatPersistence";
import useChatSend from "./hooks/useChatSend";
import useAnalysisLifecycle from "./hooks/useAnalysisLifecycle";

export default function ChatProCore({ user, pro = false }) {
  const navigate = useNavigate();
  const engineRef = useRef(null);
  const preventNextResetRef = useRef(false);

  const usuarioId = user?.uid ?? null;

  // =============================
  // STATE
  // =============================

  const [contextIdActivo, setContextIdActivo] = useState(null);
  const [analysisIdActivo, setAnalysisIdActivo] = useState(null);
  const [messages, setMessages] = useState([]);

  const [courtOpen, setCourtOpen] = useState(false);
  const [courtData, setCourtData] = useState(null);
  const [courtLoading, setCourtLoading] = useState(false);

  const legalAlert = false; // 🔒 Ya no se activa automáticamente

  // =============================
  // SESSION
  // =============================

  const { sessionId } = useChatSession({
    analysisId: analysisIdActivo,
    preventNextResetRef,
    onSessionReset: () => setMessages([]),
  });

  useChatPersistence({
    usuarioId,
    contextId: contextIdActivo,
    sessionId,
    messages,
    setMessages,
  });

  const { sendMessage } = useChatSend({
    setMessages,
    transport: async ({ text, adjuntos, sessionId }) =>
      engineRef.current.enviarMensaje(text, adjuntos, { sessionId }),
  });

  const { handleIntent } = useAnalysisLifecycle({
    usuarioId,
    contextId: contextIdActivo,
    analysisId: analysisIdActivo,
    setAnalysisId: setAnalysisIdActivo,
    createAnalysisFn: () => {},
    buildTitle: buildAutoAnalysisTitle,
    preventNextResetRef,
  });

  // =====================================================
  // 🔎 ANÁLISIS GLOBAL — SOLO POR INTENCIÓN DEL USUARIO
  // =====================================================

  const runFullDocumentReview = useCallback(async () => {
    const fullAssistantText = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .join("\n\n");

    if (!fullAssistantText || fullAssistantText.length < 300) return;

    try {
      setCourtLoading(true);

      const diag = await processLegalText(fullAssistantText, {
        courtReview: true,
        deepReasoning: true,
        detectDocType: true,
        rhetoricalStructure: true,
        useEmbeddingsForContradictions: true,
      });

      if (diag?.ok) {
        setCourtData(diag.result);
        setCourtOpen(true);
      }
    } catch (err) {
      console.warn("Full document review error:", err.message);
    } finally {
      setCourtLoading(false);
    }
  }, [messages]);

  // =====================================================
  // SEND (SIN ANÁLISIS AUTOMÁTICO)
  // =====================================================

  const onSend = useCallback(
    async (texto, adjuntos) => {
      const res = await sendMessage({
        text: texto,
        adjuntos,
        sessionId,
      });

      if (!res) return;

      // 1️⃣ Agenda automática
      if (res.intent === "agenda.create" && res.payload) {
        await createAgendaEvento({
          usuarioId,
          ...res.payload,
        });
      }

      // 2️⃣ Lifecycle interno
      handleIntent({
        intent: res.intent,
        seedText: texto,
      });

      // 3️⃣ 🔥 Activación intencional del análisis
      if (
        res.intent === "document.review" ||
        res.intent === "document.analyze"
      ) {
        runFullDocumentReview();
      }
    },
    [
      sendMessage,
      handleIntent,
      sessionId,
      usuarioId,
      runFullDocumentReview,
    ]
  );

  // =====================================================
  // UI
  // =====================================================

  return (
    <LitisBotCognitiveProvider
      initialMode={LITIS_MODE.LITIGANTE}
      initialRole={LITIS_ROLES.LITIGANTE}
    >
      <ChatShell
        header={
          <AnalysisHeader
            legalAlert={false}
            onOpenCourtReview={() => setCourtOpen(true)}
            onOpenControlCenter={() => setCourtOpen(true)}
          />
        }
        composer={<ChatInputBar onSend={onSend} />}
      >
        <AnalysisWindow
          messages={messages}
          activeChatId={sessionId}
        />
      </ChatShell>

      {/* 🧠 Motor LLM */}
      <LitisBotEngine
        ref={engineRef}
        usuarioId={usuarioId}
        caseId={contextIdActivo}
        chatIdActivo={sessionId}
        mensajes={messages}
        pro={pro}
      />

      {/* ⚖️ Revisor de Corte */}
      <CourtReviewPanel
        open={courtOpen}
        onClose={() => setCourtOpen(false)}
        data={courtData}
        loading={courtLoading}
      />
    </LitisBotCognitiveProvider>
  );
}