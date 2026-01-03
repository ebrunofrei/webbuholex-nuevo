import React, { useEffect, useState } from "react";

export default function CaseBriefingPanel({ caseId }) {
  const [briefing, setBriefing] = useState(null);

  useEffect(() => {
    if (!caseId) return;

    fetch(`/api/cases/${caseId}/briefing`)
      .then((r) => r.json())
      .then((d) => setBriefing(d.briefing))
      .catch(() => {});
  }, [caseId]);

  if (!briefing) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Generando briefing jurídico…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-neutral-900">
      <h1 className="text-xl font-bold">
        Briefing jurídico del caso
      </h1>

      {briefing.sections.map((s) => (
        <section key={s.key}>
          <h2 className="text-md font-semibold mb-2">
            {s.title}
          </h2>
          <pre className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {JSON.stringify(s.content, null, 2)}
          </pre>
        </section>
      ))}
    </div>
  );
}
