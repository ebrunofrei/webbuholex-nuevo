// src/layouts/OficinaVirtualLayout.jsx
import React from "react";
import Sidebar from "@/components/Sidebar";
export default function OficinaVirtualLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4 min-w-0">{children}</main>
    </div>
  );
}
