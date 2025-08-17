import React from "react";

export default function ToggleNotificaciones({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <button
        onClick={() => onChange(!value)}
        className={`rounded-full p-2 border transition-colors 
          ${value
            ? "bg-yellow-300 text-yellow-900 border-yellow-400 shadow"
            : "bg-gray-200 text-gray-500 border-gray-300"}`}
        title={value
          ? "Notificaciones activadas para este expediente"
          : "Notificaciones desactivadas"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C6.67 7.165 6 8.97 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>
      <span className="text-xs font-semibold">
        {value
          ? "Alertas activas para este expediente"
          : "Alertas desactivadas"}
      </span>
    </div>
  );
}
