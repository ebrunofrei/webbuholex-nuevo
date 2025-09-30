// src/pages/db/ServiciosAdmin.jsx
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";
import { CATEGORIES } from "@services/servicesApi";

const ADMIN = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default function ServiciosAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email ? ADMIN.includes(u.email) : false);
    });
    return () => unsub();
  }, []);

  if (!user) {
    return (
      <section className="max-w-4xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-2">Administración de Servicios</h1>
        <p className="text-sm text-gray-600">
          Inicia sesión para gestionar la grilla de servicios.
        </p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="max-w-4xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-2">Acceso restringido</h1>
        <p className="text-sm text-gray-600">
          Tu cuenta no tiene permisos para administrar servicios.
        </p>
      </section>
    );
  }

  return (
    <section className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Servicios (Admin)</h1>
      <p className="text-sm text-gray-600 mb-6">
        Vista solo de lectura (rápida). Si quieres CRUD completo, lo activamos
        luego con Firestore.
      </p>

      <div className="space-y-8">
        {CATEGORIES.map((cat) => (
          <div key={cat.slug} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-3 mb-3">
              {cat.icon}
              <h2 className="text-lg font-semibold">{cat.title}</h2>
            </div>
            <ul className="text-sm grid md:grid-cols-2 gap-2">
              {cat.items.map((it) => (
                <li key={it.title} className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <div>
                    <div className="font-medium">{it.title}</div>
                    <div className="text-gray-600">{it.price}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
