import { createAgendaEvento } from "@/services/agendaEventosMongoService";

export function useAgendaIntent({
  usuarioId,
  sessionId,
  setMessages,
}) {

  async function handleAgendaFromIntent(res) {
    if (!res) return;

    // 1️⃣ Si viene agendaDraft → no crear aún
    if (res.assistantMessage?.meta?.agendaDraft) {
      return; // UI mostrará botones o esperará confirmación
    }

    // 2️⃣ Si viene intent directo de creación
    if (res.intent === "agenda.create" && res.payload) {
      try {
        const saved = await createAgendaEvento({
          usuarioId,
          sessionId,
          ...res.payload,
        });

        return saved;
      } catch {
        console.warn("Error creando evento agenda");
      }
    }
  }

  async function confirmAgenda(draft, msgId) {
    try {
      const saved = await createAgendaEvento({
        usuarioId,
        sessionId,
        ...draft,
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? {
                ...m,
                content: "📅 Evento agendado correctamente ✅",
                meta: { ...m.meta, agendaMeta: saved, agendaDraft: null },
              }
            : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, content: "No pude agendar el evento." }
            : m
        )
      );
    }
  }

  function cancelAgenda(msgId) {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId
          ? { ...m, content: "Evento descartado.", meta: { ...m.meta, agendaDraft: null } }
          : m
      )
    );
  }

  return {
    handleAgendaFromIntent,
    confirmAgenda,
    cancelAgenda,
  };
}