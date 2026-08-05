# Contratos de agentes jurisprudenciales

Los siete agentes son contratos de dominio con `enabled: false`; no contienen prompts de interfaz ni llaman modelos externos.

- `JurisprudenceQueryAgent`: clasifica el problema y normaliza términos.
- `JurisprudenceRetrievalAgent`: recupera fuentes oficiales aprobadas.
- `JudgmentReadingAgent`: conserva estructura y páginas.
- `HoldingExtractionAgent`: separa problemas, ratio, obiter y votos.
- `JurisprudenceComparisonAgent`: compara manteniendo citas separadas.
- `ApplicabilityAssessmentAgent`: identifica similitudes, diferencias, condiciones, riesgos y límites.
- `CitationVerificationAgent`: bloquea citas o atribuciones no comprobadas.

Skills modeladas: `classify-legal-query`, `normalize-jurisprudence-terms`, `parse-judgment-structure`, `extract-legal-issues`, `extract-holdings`, `extract-relevant-grounds`, `compare-judgments`, `assess-case-applicability`, `verify-jurisprudence-citations`, `summarize-long-judgment`, `explain-for-lawyer` y `explain-for-citizen`.

La salida no puede avanzar como verificada si un criterio carece de cita, si la fuente no es oficial o si no se conserva la paginación necesaria.
