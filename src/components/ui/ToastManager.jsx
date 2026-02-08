import React, { useEffect, useState } from "react";

export default function ToastManager() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const { message, type = "info", duration = 2500 } = e.detail || {};
      if (!message) return;

      setToast({ message, type });

      setTimeout(() => {
        setToast(null);
      }, duration);
    };

    window.addEventListener("litisbot:toast", handler);
    return () => window.removeEventListener("litisbot:toast", handler);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
      <div
        className="
          px-4 py-3 rounded-xl shadow-lg
          bg-black text-white text-sm
          animate-fadeIn
        "
      >
        {toast.message}
      </div>
    </div>
  );
}
