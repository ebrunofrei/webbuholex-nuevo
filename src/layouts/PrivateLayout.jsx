// src/layouts/PrivateLayout.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";

export default function PrivateLayout({ children }) {
  const { user } = useAuth();

  // Si no hay usuario autenticado, redirige a /login
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4">{children}</main>
    </div>
  );
}
