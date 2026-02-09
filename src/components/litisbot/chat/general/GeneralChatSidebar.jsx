import {
  MdHistory,
  MdClose,
  MdArrowBack,
  MdSettings,
  MdEdit,
  MdArchive,
  MdRestore,
  MdDelete,
} from "react-icons/md";
import { FaPlus } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";

/* ============================================================
   HELPERS
============================================================ */
function formatRelative(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();

  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < min) return "hace un momento";
  if (diff < hour) return `${Math.floor(diff / min)} min`;
  if (diff < day) return `${Math.floor(diff / hour)} h`;
  return `${Math.floor(diff / day)} d`;
}

function snippet(text) {
  if (!text) return "Mensaje sin contenido";
  return text.length > 42 ? text.slice(0, 42) + "…" : text;
}

/* ============================================================
   SIDEBAR — FINAL R7.7++
============================================================ */
export default function GeneralChatSidebar({
  sessions = [],
  activeSessionId,
  setActiveSessionId,
  createSession,
  renameSession,
  archiveSession,
  restoreSession,
  deleteSession,
  user,
  isOpen,
  onClose,
}) {
  const [hoveredSessionId, setHoveredSessionId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  /* Escape closes sidebar */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* Sort sessions */
  const { activeSessions, archivedSessions } = useMemo(() => {
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    return {
      activeSessions: sorted.filter((s) => !s.archived),
      archivedSessions: sorted.filter((s) => s.archived),
    };
  }, [sessions]);

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-screen w-80 max-w-[85vw]
          flex flex-col bg-white border-r border-slate-200
          z-50 transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-xl md:shadow-none
        `}
      >
        {/* HEADER */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-100">
          <button
            onClick={createSession}
            className="
              flex-1 flex items-center justify-center gap-2 py-2.5
              bg-slate-900 text-white rounded-lg text-sm font-bold
              hover:bg-black active:scale-[0.97] transition shadow-sm
            "
          >
            <FaPlus size={12} />
            Nueva consulta
          </button>

          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* BODY */}
        <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
            <MdHistory size={14} className="opacity-70" />
            Historial
          </div>

          {/* ARCHIVED */}
          {archivedSessions.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Archivadas
              </div>

              <div className="space-y-1">
                {archivedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg
                               text-[12px] text-slate-500 hover:bg-slate-50 transition"
                  >
                    <span className="truncate">{snippet(s.title)}</span>
                    <button
                      onClick={() => restoreSession?.(s.id)}
                      className="p-1 rounded hover:bg-slate-200"
                    >
                      <MdRestore size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE SESSIONS */}
          <div className="space-y-1 mt-2">
            {activeSessions.map((s) => {
              const active = activeSessionId === s.id;

              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredSessionId(s.id)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                  className={`
                    w-full flex flex-col px-3 py-2.5 rounded-lg cursor-pointer
                    transition-all
                    ${
                      active
                        ? "bg-slate-100 border border-slate-300 shadow-sm"
                        : "hover:bg-slate-50"
                    }
                  `}
                >
                  {/* TOP LINE */}
                  <div className="flex items-center justify-between gap-2">
                    {editingSessionId === s.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => {
                          renameSession?.(s.id, editingTitle);
                          setEditingSessionId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameSession?.(s.id, editingTitle);
                            setEditingSessionId(null);
                          }
                          if (e.key === "Escape") {
                            setEditingSessionId(null);
                            setEditingTitle("");
                          }
                        }}
                        className="
                          w-full text-sm font-semibold
                          bg-white border border-slate-300 rounded px-1
                          focus:outline-none focus:ring-1 focus:ring-slate-400
                        "
                      />
                    ) : (
                      <span className="text-sm font-semibold truncate">
                        {snippet(s.title)}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {hoveredSessionId === s.id && (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditingSessionId(s.id);
                              setEditingTitle(s.title);
                            }}
                            className="p-1 rounded hover:bg-slate-200"
                          >
                            <MdEdit size={14} />
                          </button>

                          {!s.archived && (
                            <button
                              onClick={() => archiveSession?.(s.id)}
                              className="p-1 rounded hover:bg-slate-200"
                            >
                              <MdArchive size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => deleteSession?.(s.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-500"
                          >
                            <MdDelete size={14} />
                          </button>
                        </div>
                      )}

                      <span className="text-[11px] text-slate-400">
                        {formatRelative(s.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* SUBTEXT */}
                  <div className="text-[12px] text-slate-500 mt-0.5 truncate">
                    {snippet(s.lastMessage || s.title)}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* FOOTER */}
        <footer className="p-4 border-t border-slate-200 bg-white/70">
          <a
            href="/"
            className="
              w-full flex items-center justify-center gap-2 py-2.5
              bg-slate-50 text-slate-500 rounded-lg border border-slate-200
              hover:bg-slate-900 hover:text-white transition-all
              text-[11px] font-bold
            "
          >
            <MdArrowBack size={14} />
            Ecosistema BúhoLex
          </a>

          <div className="flex items-center gap-3 mt-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              {user?.name?.[0] || "U"}
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-semibold text-slate-800 truncate">
                {user?.name || "Abogado Invitado"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase">
                {user?.plan || "Free"}
              </div>
            </div>

            <MdSettings size={18} className="text-slate-400" />
          </div>
        </footer>
      </aside>

      {/* SCROLLBAR */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}
