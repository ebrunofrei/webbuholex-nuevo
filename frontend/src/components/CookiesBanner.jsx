// src/components/CookiesBanner.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const LOCAL_KEY = "cookies_buholex_accepted";

export default function CookiesBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(LOCAL_KEY);
    if (!accepted) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(LOCAL_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-neutral-900 bg-opacity-90 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-xl">
      <span className="text-sm mb-2 md:mb-0">
        Usamos cookies propias y de terceros para mejorar tu experiencia en BúhoLex.{" "}
        <Link to="/legal/aviso-cookies" className="underline text-blue-200 hover:text-blue-400 ml-1" target="_blank" rel="noopener noreferrer">
          Más información
        </Link>
      </span>
      <button
        onClick={handleAccept}
        className="mt-2 md:mt-0 bg-white text-neutral-900 font-semibold px-5 py-2 rounded-lg shadow hover:bg-blue-200 transition-all"
      >
        Aceptar
      </button>
    </div>
  );
}
