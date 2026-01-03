// src/features/history/CaseList.jsx
import CaseItem from "./CaseItem";

export default function CaseList({ cases, activeCaseId, onOpenCase }) {
  if (!cases.length) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        No tienes casos aún
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto">
      {cases.map((c) => (
        <CaseItem
          key={c._id}
          caseData={c}
          active={c._id === activeCaseId}
          onClick={() => onOpenCase(c._id)}
        />
      ))}
    </ul>
  );
}
