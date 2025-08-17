import React from "react";
import useLegalOSStore from "@/store/useLegalOSStore";

// Drag&Drop builder para organizar módulos, y bloquear PRO según plan
const BuilderModulos = () => {
  const { branding, setModulos, guardarEnFirestore, plan } = useLegalOSStore();

  const handleDrag = (from, to) => {
    const nuevos = [...branding.modulos];
    const [item] = nuevos.splice(from, 1);
    nuevos.splice(to, 0, item);
    setModulos(nuevos);
  };

  const handleToggle = idx => {
    const nuevos = [...branding.modulos];
    // Si el módulo es PRO y no tiene plan PRO, no deja activarlo
    if (nuevos[idx].pro && plan !== "pro" && plan !== "enterprise") {
      alert("Este módulo es solo para usuarios PRO. Actualiza tu plan para activarlo.");
      return;
    }
    nuevos[idx].visible = !nuevos[idx].visible;
    setModulos(nuevos);
  };

  const modulos = branding.modulos || [];

  return (
    <div className="bg-white p-5 rounded shadow max-w-md mx-auto mt-4">
      <h2 className="text-lg font-bold mb-3 text-[#b03a1a]">Organiza tu Oficina</h2>
      <ul>
        {modulos.map((mod, idx) => (
          <li
            key={mod.key}
            draggable
            onDragStart={e => e.dataTransfer.setData("from", idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const from = +e.dataTransfer.getData("from");
              handleDrag(from, idx);
            }}
            className={`flex items-center gap-2 p-2 border-b ${mod.pro && (plan !== "pro" && plan !== "enterprise") ? "bg-yellow-50" : ""}`}
            style={{ opacity: mod.visible ? 1 : 0.5, cursor: "move" }}
          >
            <span className="flex-1">
              {mod.label}
              {mod.pro && (
                <span className="ml-2 text-xs text-[#b03a1a] font-bold">PRO</span>
              )}
            </span>
            <input
              type="checkbox"
              checked={mod.visible}
              onChange={() => handleToggle(idx)}
              disabled={mod.pro && plan !== "pro" && plan !== "enterprise"}
            />
            <span className="text-gray-400 text-xs">(Arrastra para reordenar)</span>
          </li>
        ))}
      </ul>
      <button
        className="bg-[#b03a1a] text-white px-4 py-2 mt-4 rounded"
        onClick={guardarEnFirestore}
      >Guardar cambios</button>
    </div>
  );
};

export default BuilderModulos;
