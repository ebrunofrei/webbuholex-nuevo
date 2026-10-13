import type {
  Citation,
  JurisprudenceInterpretation,
} from "@/lib/hermes/contracts/jurisprudence-interpretation";
import styles from "./jurisprudence.module.css";

export interface JurisprudenceInterpretationViewProps {
  readonly interpretation: JurisprudenceInterpretation;
}

function VerbatimQuoteBlock({
  citation,
}: {
  readonly citation: Citation;
}) {
  return (
    <blockquote className={styles.verbatimQuote}>
      <p>{citation.quote}</p>
      {citation.paragraphReference || citation.pageReference ? (
        <footer className={styles.quoteLocators}>
          {citation.paragraphReference ? (
            <span>Párrafo: {citation.paragraphReference}</span>
          ) : null}
          {citation.pageReference ? (
            <span>Página: {citation.pageReference}</span>
          ) : null}
        </footer>
      ) : null}
    </blockquote>
  );
}

export function JurisprudenceInterpretationView({
  interpretation,
}: JurisprudenceInterpretationViewProps) {
  return (
    <div className={styles.interpretationView} aria-label="Interpretación jurídica estructurada">
      {/* 0. AVISO VISIBLE OBLIGATORIO */}
      <div className={styles.noticeBanner} role="note" aria-label="Aviso sobre síntesis asistida">
        <strong>Aviso de síntesis asistida ({interpretation.verificationStatus})</strong>
        <p>
          Síntesis asistida generada por inteligencia artificial.
          No constituye asesoría jurídica ni opinión vinculante.
        </p>
      </div>

      {/* 1. SÍNTESIS EJECUTIVA */}
      <section className={styles.interpretationSection}>
        <h4>1. Síntesis ejecutiva</h4>
        <dl className={styles.interpretationDl}>
          <div>
            <dt>Materia jurídica</dt>
            <dd>{interpretation.legalMatter}</dd>
          </div>
          <div>
            <dt>Resumen</dt>
            <dd>{interpretation.summary}</dd>
          </div>
        </dl>

        {interpretation.legalIssues.length > 0 ? (
          <div className={styles.subSection}>
            <h5>Problemas jurídicos</h5>
            <ul className={styles.interpretationList}>
              {interpretation.legalIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 2. RATIO DECIDENDI */}
      <section className={styles.interpretationSection}>
        <h4>2. Ratio decidendi</h4>
        <p className={styles.metaBadge}>Estado: {interpretation.ratioDecidendi.status}</p>
        {interpretation.ratioDecidendi.text ? (
          <p className={styles.bodyText}>{interpretation.ratioDecidendi.text}</p>
        ) : null}

        {interpretation.ratioDecidendi.support.length > 0 ? (
          <div className={styles.subSection}>
            <h5>Sustento documental verbatim</h5>
            {interpretation.ratioDecidendi.support.map((citation, idx) => (
              <VerbatimQuoteBlock key={idx} citation={citation} />
            ))}
          </div>
        ) : null}
      </section>

      {/* 3. CRITERIOS CLAVE Y ALCANCE */}
      <section className={styles.interpretationSection}>
        <h4>3. Criterios clave y alcance</h4>
        {interpretation.keyCriteria.length > 0 ? (
          <div className={styles.subSection}>
            <h5>Criterios clave</h5>
            <ul className={styles.interpretationList}>
              {interpretation.keyCriteria.map((criterion, idx) => (
                <li key={idx}>{criterion}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <dl className={styles.interpretationDl}>
          <div>
            <dt>Alcance</dt>
            <dd>{interpretation.scope}</dd>
          </div>
          <div>
            <dt>Limitaciones</dt>
            <dd>{interpretation.limitations}</dd>
          </div>
        </dl>
      </section>

      {/* 4. FUNDAMENTOS ACCESORIOS (OBITER DICTA) */}
      {interpretation.obiterDicta.length > 0 ? (
        <section className={styles.interpretationSection}>
          <h4>4. Fundamentos accesorios (Obiter dicta)</h4>
          <div className={styles.groundedGroup}>
            {interpretation.obiterDicta.map((item, idx) => (
              <div key={idx} className={styles.groundedItem}>
                <p className={styles.bodyText}>{item.text}</p>
                {item.support.map((citation, cIdx) => (
                  <VerbatimQuoteBlock key={cIdx} citation={citation} />
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 5. NORMAS Y PRECEDENTES CITADOS */}
      {(interpretation.citedNorms.length > 0 || interpretation.citedPrecedents.length > 0) ? (
        <section className={styles.interpretationSection}>
          <h4>5. Normas y precedentes citados</h4>
          {interpretation.citedNorms.length > 0 ? (
            <div className={styles.subSection}>
              <h5>Normas citadas</h5>
              <div className={styles.groundedGroup}>
                {interpretation.citedNorms.map((item, idx) => (
                  <div key={idx} className={styles.groundedItem}>
                    <strong>{item.reference}</strong>
                    {item.support.map((citation, cIdx) => (
                      <VerbatimQuoteBlock key={cIdx} citation={citation} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {interpretation.citedPrecedents.length > 0 ? (
            <div className={styles.subSection}>
              <h5>Precedentes citados</h5>
              <div className={styles.groundedGroup}>
                {interpretation.citedPrecedents.map((item, idx) => (
                  <div key={idx} className={styles.groundedItem}>
                    <strong>{item.reference}</strong>
                    {item.support.map((citation, cIdx) => (
                      <VerbatimQuoteBlock key={cIdx} citation={citation} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* 6. CITAS DOCUMENTALES ADICIONALES */}
      {interpretation.citations.length > 0 ? (
        <section className={styles.interpretationSection}>
          <h4>6. Citas textuales de respaldo</h4>
          {interpretation.citations.map((citation, idx) => (
            <VerbatimQuoteBlock key={idx} citation={citation} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
