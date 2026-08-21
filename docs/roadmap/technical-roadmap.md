# Technical Roadmap

Este documento define el estado del roadmap técnico del proyecto.

## Reglas Arquitectónicas Congeladas
- Owl/Hermes evoluciona en paralelo y solo incorpora capacidades de runtime después de superar gates verificables.
- Owl/Hermes no bloquea Jurisprudencia ni el release general de BúhoLex.

## Estado Operativo Transversal
- `Production = FROZEN`
- `CODE_AVAILABLE != ENABLED != ACTIVATED`

## Autoridad (Reglas Transversales)
- `LLM proposes`
- `Application verifies`
- `Domain decides`
- `Guards permit or reject`

## Carril A — Jurisprudencia

| Tarea / Fase | Estado | Descripción |
| :--- | :--- | :--- |
| **J1-E** | CLOSED | - |
| **J1-F** | CLOSED | - |
| **J1-G.1–G.7** | CLOSED | - |
| **J1-G.8** | CLOSED / FROZEN | Runtime freeze cerrado según evidencia; no implica activación en Production. |
| **J2** | ACTIVE | Fase principal actual de Jurisprudencia. |
| **J2-A.2G** | CLOSED / COMMITTED | El texto oficial puede existir privadamente antes de publicación; su presencia no constituye autorización de publicación. |
| **J2-A.2J** | CLOSED / COMMITTED | resolutionNumber nullable en modelo canónico/persistencia cuando no existe número independiente. |
| **J2-A.2K-F2** | CLOSED / COMMITTED | Preview valida el objeto normalizado contra el contrato persistible exacto. |
| **J2-A.3** | TECHNICALLY_VERIFIED | Persistencia física controlada en STAGING verificada (tres pilotos). Documentation sync pending human Git review. |

## Carril B — Owl / Hermes

| Tarea / Fase | Estado | Descripción |
| :--- | :--- | :--- |
| **HERMES-A0** | FROZEN | - |
| **HERMES-A0-F** | FROZEN | - |
| **HERMES-A1** | NEXT / PLANNED | Trust Boundary + Prompt/Output Contracts. (REAL_LLM_PROVIDER = NOT_IMPLEMENTED, RAG = NOT_IMPLEMENTED) |
| **HERMES-A2** | PLANNED | Provider-Agnostic Model Port |
| **HERMES-A3** | PLANNED | Execution Context + Observability + Error Taxonomy |
| **HERMES-A4** | PLANNED | Jurisprudence Public Search Port Adapter |
| **HERMES-A5** | PLANNED | Grounding / Citation Verification |
| **HERMES-A6** | PLANNED | Authorization + Usage/Budget Governance |
| **HERMES-A7** | PLANNED | Deterministic Provider Simulator |
| **HERMES-A8** | PLANNED | First Real LLM Provider Adapter |
| **HERMES-A9** | PLANNED | Real End-to-End Legal Analysis Pilot |
