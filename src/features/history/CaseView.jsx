// src/features/history/CaseView.jsx
export default function CaseView({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((m) => (
        <div
          key={m._id}
          className={`max-w-3xl ${
            m.role === "assistant" ? "ml-0" : "ml-auto"
          }`}
        >
          <div
            className={`p-3 rounded text-sm whitespace-pre-wrap
              ${
                m.role === "assistant"
                  ? "bg-neutral-100 dark:bg-neutral-800"
                  : "bg-red-600 text-white"
              }`}
          >
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}
