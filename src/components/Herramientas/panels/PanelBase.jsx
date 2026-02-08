// ============================================================================
// 🦉 PanelBase — Campos comunes a TODOS los regímenes
// ----------------------------------------------------------------------------
// - UI pura
// - NO cálculos
// - NO reglas jurídicas
// ============================================================================

export default function PanelBase({ onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <label>
        Fecha de ingreso
        <input
          type="date"
          onChange={(e) => onChange({ fechaIngreso: e.target.value })}
          className="border rounded px-2 py-1 w-full"
        />
      </label>

      <label>
        Fecha de cese
        <input
          type="date"
          onChange={(e) => onChange({ fechaCese: e.target.value })}
          className="border rounded px-2 py-1 w-full"
        />
      </label>

      <label>
        Remuneración computable (S/.)
        <input
          type="number"
          min={0}
          onChange={(e) =>
            onChange({ remuneracion: Number(e.target.value) })
          }
          className="border rounded px-2 py-1 w-full"
        />
      </label>

      <label>
        Días pendientes último mes
        <input
          type="number"
          min={0}
          max={31}
          onChange={(e) =>
            onChange({ diasPendientes: Number(e.target.value || 0) })
          }
          className="border rounded px-2 py-1 w-full"
        />
      </label>
    </div>
  );
}
