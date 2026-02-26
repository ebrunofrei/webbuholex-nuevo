// litisbot/chat-pro/hooks/useChatSession.js

import { useEffect, useRef } from "react";
import { ROOT_SESSION_ID } from "../services/chatStorage";

export default function useChatSession({
  analysisId,
  preventNextResetRef,
  onSessionReset,
}) {
  const lastSessionRef = useRef(null);

  const sessionId = analysisId || ROOT_SESSION_ID;

  useEffect(() => {
    const prev = lastSessionRef.current;
    const next = sessionId;

    if (prev === next) return;

    if (preventNextResetRef?.current) {
      preventNextResetRef.current = false;
      lastSessionRef.current = next;
      return;
    }

    if (onSessionReset) onSessionReset();

    lastSessionRef.current = next;
  }, [sessionId, onSessionReset, preventNextResetRef]);

  return { sessionId };
}