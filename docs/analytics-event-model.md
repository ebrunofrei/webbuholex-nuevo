# Modelo futuro de eventos

Los eventos definidos en `data/analytics-events.ts` son contratos de dominio con estado `modeled_only`. No existe emisor, SDK, endpoint ni tercero conectado.

Eventos previstos:

- `portal_public_enter`
- `portal_intelligent_enter`
- `legal_panel_open`
- `legal_policy_open`
- `public_resource_open`
- `jurisprudence_open`
- `manual_open`
- `product_view`
- `service_view`
- `assistant_cta_open`
- `signup_start`
- `login_start`
- `premium_feature_intent`
- `jurisprudence_search`
- `jurisprudence_result_open`
- `official_source_open`
- `jurisprudence_filter_apply`
- `jurisprudence_assistant_intent`
- `quick_read_intent`
- `compare_intent`
- `applicability_intent`
- `signup_from_jurisprudence`
- `premium_analysis_intent`

Todos declaran `sendsToThirdParties: false` y `permitsLegalQueryContent: false`. Nunca debe registrarse el texto de una consulta jurídica, documentos privados, nombres de clientes, estrategia jurídica ni expedientes cargados.

Las categorías de cookies analítica, personalización y publicidad permanecen desactivadas. No se muestra banner porque no se instalaron tratamientos no necesarios.
