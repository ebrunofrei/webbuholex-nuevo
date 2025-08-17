import React from "react";

export default function ColaboradoresCard({ colaboradores }) {
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#41B6E6]/10 p-5 flex-1 mt-8">
      <h2 className="text-lg font-bold mb-3 text-[#41B6E6] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#41B6E6] mr-2" />
        Colaboradores Activos
      </h2>
      <div className="flex flex-wrap gap-4">
        {colaboradores.map((user, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center min-w-[120px] p-3 rounded-xl border"
            style={{
              borderColor: user.color,
              background: "#faf8f6"
            }}
          >
            <span
              className="w-12 h-12 flex items-center justify-center rounded-full text-white font-extrabold text-xl mb-2"
              style={{ background: user.color }}
            >
              {user.nombre.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </span>
            <div className="font-semibold text-[#535353] text-center">{user.nombre}</div>
            <div className="text-xs text-gray-500 text-center">{user.rol}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
