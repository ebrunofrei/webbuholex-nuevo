// src/components/PageContainer.jsx
import React from "react";

export default function PageContainer({ children, className = "" }) {
  return (
    <div
      className={`w-full max-w-3xl mx-auto px-4 sm:px-8 py-8 min-h-[70vh] ${className}`}
    >
      {children}
    </div>
  );
}
