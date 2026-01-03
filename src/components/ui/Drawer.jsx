import { useEffect } from "react";

export default function Drawer({
  open,
  side = "left", // left | right
  onClose,
  children,
  width = "320px",
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  if (!open) return null;

  const sideClasses =
    side === "right"
      ? "right-0 translate-x-0"
      : "left-0 translate-x-0";

  return (
    <div className="fixed inset-0 z-[300] flex">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* PANEL */}
      <aside
        className={`
          absolute top-0 ${sideClasses}
          h-full bg-white
          shadow-2xl
          transition-transform
        `}
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </aside>
    </div>
  );
}
