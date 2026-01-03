// src/features/history/CaseItem.jsx
export default function CaseItem({ caseData, active, onClick }) {
  return (
    <li
      onClick={onClick}
      className={`px-3 py-2 cursor-pointer text-sm
        ${active ? "bg-red-50 dark:bg-red-900/30" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
    >
      <div className="font-medium truncate">
        {caseData.title || "Caso jurídico"}
      </div>
      <div className="text-xs text-neutral-500">
        {caseData.area || "general"}
      </div>
    </li>
  );
}
