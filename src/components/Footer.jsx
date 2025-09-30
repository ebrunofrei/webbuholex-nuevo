// src/components/Footer.jsx
import React from "react";
import LegalLinks from "@/components/LegalLinks";

export default function Footer() {
  return (
    <footer className="w-full bg-neutral-100 dark:bg-neutral-900 py-6 border-t border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm">
          © {new Date().getFullYear()} BúhoLex. Todos los derechos reservados.
        </p>
        <LegalLinks />
      </div>
    </footer>
  );
}
