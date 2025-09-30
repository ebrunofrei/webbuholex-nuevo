import React, { useState } from "react";
import BuscadorBiblioteca from "../components/BuscadorBiblioteca";
import GridArchivos from "../components/GridArchivos";

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
