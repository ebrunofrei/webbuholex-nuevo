// src/components/ui/use-toast.js
import * as React from "react";

const ToastContext = React.createContext();

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const pushToast = React.useCallback(({ title, description }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000); // se borra a los 5s
  }, []);

  return (
    <ToastContext.Provider value={{ toast: pushToast }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 w-72 animate-fadeIn"
          >
            <strong className="block text-sm font-semibold text-gray-900">
              {t.title}
            </strong>
            <span className="block text-sm text-gray-700">{t.description}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
