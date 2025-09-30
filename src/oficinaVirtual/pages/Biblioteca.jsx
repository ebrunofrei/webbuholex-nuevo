import React, { useState } from "react";
import BuscadorBiblioteca from "@components/../components/BuscadorBiblioteca".replace("components/", "");
import GridArchivos from "@components/../components/GridArchivos".replace("components/", "");

export default function Biblioteca() {
  const [query, setQuery] = useState("");
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Biblioteca Jurídica</h2>
      <BuscadorBiblioteca value={query} onChange={setQuery} />
      <GridArchivos query={query} />
    </div>
  );
}
