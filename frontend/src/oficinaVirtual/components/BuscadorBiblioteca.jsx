export default function BuscadorBiblioteca({ value, onChange }) {
  return (
    <div className="mb-5 flex gap-3">
      <input
        className="border rounded-lg px-4 py-2 w-80"
        placeholder="Buscar archivo, materia, año..."
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button className="bg-[#b03a1a] text-white px-4 py-2 rounded-lg">Subir archivo</button>
    </div>
  );
}
