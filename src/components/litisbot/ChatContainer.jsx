// src/components/litisbot/ChatContainer.jsx
import BubbleChatLayout from "@/components/litisbot/chat/bubble/BubbleChatLayout";

export default function ChatContainer({
  open,
  onClose,
  usuarioId,
  pro,
  jurisSeleccionada = null,
}) {
  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[9998]">
      <BubbleChatLayout
        usuarioId={usuarioId}
        pro={pro}
        jurisSeleccionada={jurisSeleccionada}
        onClose={onClose}
      />
    </div>
  );
}
