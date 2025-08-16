// src/layouts/PrivateLayout.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
export default function PrivateLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4">{children}</main>
    </div>
  );
}
