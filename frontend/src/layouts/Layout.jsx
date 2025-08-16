// src/layouts/Layout.jsx
import React from "react";
import Navbar from "../components/ui/Navbar";
import Footer from "../components/Footer";

// Aquí el Layout envuelve el contenido con márgenes y máximo ancho
export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      {/* Este main es el contenedor central */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
