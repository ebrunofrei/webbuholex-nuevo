import React, { useState, useRef, useEffect } from "react";
import LitisBotChatBase from "../../components/LitisBotChatBase";

export default function LitisBotFlotante() {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ bottom: 32, right: 32 });
  const dragRef = useRef();
  const offset = useRef({ x: 0, y: 0 });

  // Desktop
  const handleMouseDown = (e) => {
    setDragging(true);
    offset.current = {
      x: e.clientX,
      y: e.clientY,
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e) => {
    setPosition(prev => ({
      bottom: Math.max(
        0,
        prev.bottom - (e.clientY - offset.current.y)
      ),
      right: Math.max(
        0,
        prev.right - (e.clientX - offset.current.x)
      ),
    }));
    offset.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => {
    setDragging(false);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  // Touch
  const handleTouchStart = (e) => {
    setDragging(true);
    const touch = e.touches[0];
    offset.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    setPosition(prev => ({
      bottom: Math.max(
        0,
        prev.bottom - (touch.clientY - offset.current.y)
      ),
      right: Math.max(
        0,
        prev.right - (touch.clientX - offset.current.x)
      ),
    }));
    offset.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = () => {
    setDragging(false);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
  };

  // --- El botón siempre es draggable ---
  return (
    <>
      {!open && (
        <button
          style={{
            position: "fixed",
            bottom: position.bottom,
            right: position.right,
            zIndex: 4000,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#b03a1a",
            boxShadow: "0 3px 18px #0003",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: dragging ? "grabbing" : "grab",
            color: "#fff",
            border: "none",
          }}
          ref={dragRef}
          onClick={() => setOpen(true)}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          aria-label="Abrir LitisBot"
        >
          <span style={{ fontSize: 32, fontWeight: 700 }}>🦉</span>
        </button>
      )}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: position.bottom,
            right: position.right,
            zIndex: 4000,
            width: 410,
            maxWidth: "98vw",
            height: 570,
            background: "#fff",
            border: "2px solid #b03a1a",
            borderRadius: 24,
            boxShadow: "0 10px 40px #0003",
            display: "flex",
            flexDirection: "column",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <LitisBotChatBase
            modoFlotante
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
