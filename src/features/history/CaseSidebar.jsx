// src/features/history/CaseSidebar.jsx
import CaseList from "./CaseList";

export default function CaseSidebar({
  cases,
  activeCase,
  onOpenCase,
  onNewCase,
}) {
  return (
    <aside className="w-72 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
      <div className="p-3 flex justify-between items-center">
        <h3 className="font-semibold text-sm">Casos</h3>
        <button
          onClick={onNewCase}
          className="text-xs px-2 py-1 rounded bg-red-600 text-white"
        >
          Nuevo
        </button>
      </div>

      <CaseList
        cases={cases}
        activeCaseId={activeCase?._id}
        onOpenCase={onOpenCase}
      />
    </aside>
  );
}
