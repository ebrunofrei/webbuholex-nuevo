import React from "react";
import type { JurisprudenceExposureAuditResult } from "@/types/jurisprudence-exposure-audit";

export interface ExposureAuditPreviewCardProps {
  readonly auditResult: JurisprudenceExposureAuditResult;
}

export function ExposureAuditPreviewCard({ auditResult }: ExposureAuditPreviewCardProps) {
  return (
    <div className="exposure-audit-preview-card p-6 border rounded-lg shadow-sm bg-white" data-testid="exposure-audit-preview-card">
      <header className="mb-6 pb-4 border-b">
        <h3 className="text-xl font-bold mb-2">Vista previa simulada</h3>
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">Sin efectos operativos</span>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded font-medium">No conectado</span>
        </div>
      </header>

      <section className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-2">Estado de Auditoría</h4>
        <div className="p-3 bg-gray-50 rounded text-sm">
          <p className="font-mono" data-testid="audit-status">status: {auditResult.status}</p>
        </div>
        {auditResult.blockers.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-sm" data-testid="audit-blockers">
            <h5 className="font-bold mb-1">Bloqueos detectados:</h5>
            <ul className="list-disc pl-5">
              {auditResult.blockers.map((blocker, idx) => (
                <li key={idx}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {auditResult.publicProjection && (
        <section className="mb-6" data-testid="audit-projection">
          <h4 className="font-semibold text-gray-700 mb-2">Proyección Pública</h4>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono">
            {JSON.stringify(auditResult.publicProjection, null, 2)}
          </pre>
        </section>
      )}

      <section className="text-xs text-gray-600 bg-gray-50 p-4 rounded border">
        <div className="mb-2">
          <span className="font-semibold text-gray-800">Campos incluidos (públicos): </span>
          <span data-testid="audit-included">{auditResult.includedFields.join(", ") || "Ninguno"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-800">Campos excluidos (sensibles/internos): </span>
          <span data-testid="audit-excluded">{auditResult.excludedFields.join(", ") || "Ninguno"}</span>
        </div>
      </section>
    </div>
  );
}
