import React from "react";

export default function ModalPro({ open, onClose, title, children, btnPro, onPro, btnTry, onTry, disableTry }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0008", zIndex: 5000, display: "flex",
      alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, minWidth: 320, maxWidth: 370,
        padding: 28, boxShadow: "0 6px 28px #0005", display: "flex", flexDirection: "column", gap: 17, position: "relative"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 18, background: "none", border: "none",
          fontSize: 24, color: "#b03a1a", fontWeight: "bold", cursor: "pointer"
        }}>×</button>
        <h3 style={{ fontWeight: 900, color: "#b03a1a", fontSize: 22, margin: 0 }}>{title}</h3>
        <div style={{ color: "#4b2e19", fontSize: 16 }}>{children}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
          {btnTry && (
            <button
              onClick={onTry}
              disabled={disableTry}
              style={{
                background: disableTry ? "#e7e1df" : "#b03a1a",
                color: disableTry ? "#8d726a" : "#fff",
                border: "none", borderRadius: 10, padding: "10px 18px",
                fontWeight: 700, fontSize: 16, flex: 1, cursor: disableTry ? "not-allowed" : "pointer"
              }}
            >
              {btnTry}
            </button>
          )}
          {btnPro && (
            <button
              onClick={onPro}
              style={{
                background: "#4b2e19",
                color: "#fff",
                border: "none", borderRadius: 10, padding: "10px 18px",
                fontWeight: 700, fontSize: 16, flex: 1, cursor: "pointer"
              }}
            >
              {btnPro}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
