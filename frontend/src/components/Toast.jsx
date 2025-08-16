import React, { useEffect } from "react";

export default function Toast({ open, message, type = "info", onClose, duration = 2500 }) {
  useEffect(() => {
    if (open) {
      const timeout = setTimeout(onClose, duration);
      return () => clearTimeout(timeout);
    }
  }, [open, onClose, duration]);

  if (!open) return null;

  const colorMap = {
    info:   { bg: "#fff", text: "#4b2e19", border: "#b03a1a" },
    success:{ bg: "#fff", text: "#4b2e19", border: "#4b2e19" },
    error:  { bg: "#fff", text: "#b03a1a", border: "#b03a1a" },
    warn:   { bg: "#fff", text: "#b03a1a", border: "#b03a1a" }
  };
  const color = colorMap[type] || colorMap.info;

  return (
    <div style={{
      position: "fixed",
      bottom: 38,
      right: 48,
      zIndex: 9999,
      background: color.bg,
      color: color.text,
      border: `2.5px solid ${color.border}`,
      borderRadius: 16,
      boxShadow: "0 2px 18px #0003",
      padding: "14px 32px",
      minWidth: 220,
      fontWeight: 700,
      fontSize: 17,
      display: "flex",
      alignItems: "center",
      gap: 10
    }}>
      {/* Ícono según tipo */}
      {type === "success" && <span style={{ color: "#4b2e19", fontSize: 22 }}>✔️</span>}
      {type === "error"   && <span style={{ color: "#b03a1a", fontSize: 22 }}>❌</span>}
      {type === "warn"    && <span style={{ color: "#b03a1a", fontSize: 22 }}>⚠️</span>}
      {type === "info"    && <span style={{ color: "#b03a1a", fontSize: 22 }}>ℹ️</span>}
      <span>{message}</span>
      <button onClick={onClose} style={{
        marginLeft: 14, background: "none", border: "none", color: color.text,
        fontWeight: 900, fontSize: 22, cursor: "pointer"
      }}>×</button>
    </div>
  );
}
