# Owl & Hermes Architecture

- **Owl**: Bounded context actual de la interfaz y experiencia inteligente.
- **Hermes**: Architectural working name.
- **NAMING_MIGRATION_REQUIRED**: NO

## Flujo Actual (Owl)

El flujo de procesamiento observado es estructural:
`OwlAnalysisEntry -> buildOwlRawTextRequest -> POST /api/owl/admission -> admitOwlRequestOnServer -> simulateOwlOrchestration -> ready/rejected -> UI`

## Estado de Capacidades

- **REAL_LLM_PROVIDER:** NOT_IMPLEMENTED
- **RAG:** NOT_IMPLEMENTED
- **EMBEDDINGS:** NOT_IMPLEMENTED
- **VECTOR_DB:** NOT_IMPLEMENTED
- **REAL_MODEL_OUTPUT:** NOT_IMPLEMENTED

## Arquitectura Objetivo [PLANNED]

El diseño planeado se fundamenta en las siguientes etapas, integrando Jurisprudencia inicialmente a través de *public search/read* (no presupone RAG vectorial nativo de inicio):

`Owl Application Service -> Prompt/Context Boundary -> Model Provider Port -> Jurisprudence Public Search/Read Port -> Structured Output Schema -> Output Guard -> Referential Consistency -> Citation/Grounding Verification -> Policy/Decision Guard`

## Principios Congelados

- `LLM proposes`
- `Application verifies`
- `Domain decides`
- `Guards permit or reject`
- `LLM citation != verified citation`
