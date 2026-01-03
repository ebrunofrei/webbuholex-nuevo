import React from "react";
import ChatSessionItem from "./ChatSessionItem.jsx";

export default function CaseChatsList({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
}) {
  if (!sessions.length) {
    return (
      <div className="px-4 py-3 text-sm text-[#7A5A3A]">
        Este caso aún no tiene chats.
      </div>
    );
  }

  return (
    <div className="mt-2 pl-2 border-l border-[#5C2E0B]/20 space-y-1">
      {sessions.map((s) => (
        <ChatSessionItem
          key={s._id}
          session={s}
          active={s._id === activeSessionId}
          onSelect={onSelectSession}
          onRename={onRenameSession}
          onDelete={onDeleteSession}
        />
      ))}
    </div>
  );
}
