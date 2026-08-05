import { editorialStatusLabels, editorialWorkflow } from "@/data/editorial-workflow";

export function EditorialWorkflow() {
  return (
    <section className="editorial-flow" aria-labelledby="editorial-flow-title">
      <div className="section-heading"><p className="eyebrow">Control editorial</p><h2 id="editorial-flow-title">Nada se publica sin completar estas etapas</h2><p>Cada cambio debe registrar archivo de origen, responsable, fecha, normas revisadas, versión pública, observaciones y autorización.</p></div>
      <ol>{editorialWorkflow.map((status, index) => <li key={status}><span>{String(index + 1).padStart(2, "0")}</span><strong>{editorialStatusLabels[status]}</strong>{index < editorialWorkflow.length - 1 ? <i aria-hidden="true">→</i> : null}</li>)}</ol>
      <p className="workflow-note">Después de publicarse, una plantilla solo puede pasar a <strong>Actualizada</strong> o <strong>Retirada</strong>.</p>
    </section>
  );
}
