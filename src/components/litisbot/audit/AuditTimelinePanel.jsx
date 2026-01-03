import React from "react";

import CaseAuditTimeline from "../../cases/CaseAuditTimeline.jsx";
import CaseAuditStrategyPanel from "./CaseAuditStrategyPanel.jsx";

export default function AuditTimelinePanel({ caseId }) {
  if (!caseId) {
    return (
      <aside className="h-full overflow-y-auto p-4">
        <div className="text-sm text-black/50 dark:text-white/50">
          Selecciona un caso para ver la auditoría jurídica.
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-full overflow-y-auto p-4 space-y-4 bg-white dark:bg-black">
      <CaseAuditDecisionPrepPanel caseId={caseId} /> {/* UX-8.0 */}
      
      <CaseAuditStrategyPanel caseId={caseId} />

      <CaseAuditChecklistPanel caseId={caseId} />
      
      <CaseAuditScenarioPanel caseId={caseId} />

      <CaseAuditTensionsPanel caseId={caseId} />   {/* UX-7.2 */}

      <CaseAuditResiliencePanel caseId={caseId} />   {/* UX-7.3 */}

      <CaseAuditManeuverPanel caseId={caseId} />     {/* UX-7.4 */}

      <CaseAuditNoReturnPanel caseId={caseId} />     {/* UX-7.5 */}

      <CaseAuditRedLinesPanel caseId={caseId} />     {/* UX-7.6 */}

      {/* 🧾 UX-6.5–6.7 — Timeline */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-black/80 dark:text-white/80">
          Línea de tiempo jurídica
        </h2>

        <CaseAuditTimeline
          caseId={caseId}
          onAction={(action) =>
            window.dispatchEvent(
            new CustomEvent("litisbot:action", { detail: action })
            )
        }
        />
      </div>
    </aside>
  );
}
