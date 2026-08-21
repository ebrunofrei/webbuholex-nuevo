# Security Boundaries

## Principios Inmutables
- `Correlation ID != authorization`
- `Correlation ID != user isolation`
- `Correlation ID != tenant isolation`
- `User text = untrusted data`
- `Retrieved jurisprudence = untrusted model context`
- `Retrieved documents = untrusted model context`
- `Untrusted content never becomes system policy`

## Estado de Autorización (Owl)
- **AUTHENTICATION:** NO
- **AUTHORIZATION:** NO
- **USER_BOUNDARY:** NO
- **TENANT_BOUNDARY:** NO

*(CORS Origin/Host validation observado no equivale a autenticación de usuario).*

## Estado de Controles

| Vector | Estado | Descripción |
| :--- | :--- | :--- |
| **SQL injection** | CURRENT_CONTROL | Queries parametrizadas/Drizzle en la superficie auditada. |
| **XSS** | CURRENT_CONTROL | React escaping en renderizado normal; JSON-LD observado con escape específico de `<` donde aplica. |
| **Command injection** | NO_CURRENT_SURFACE | Ausencia de exec/spawn o user-controlled shell sink. |
| **Path traversal / filesystem** | NO_CURRENT_SURFACE | Sin user-controlled filesystem sink. |
| **Body size** | CURRENT_CONTROL | HTTP body max = 98304 bytes; raw legal text max = 12000 characters (diferenciando HTTP control de Zod). |
| **Unicode/control chars** | FUTURE_REQUIREMENT | Decoding UTF-8 no resuelve ataques Unicode per se. |
| **Secret leakage** | FUTURE_REQUIREMENT | Planned requirement para cuando se conecte un proveedor externo (además de separación server-side evidenciada). |
| **Direct prompt injection** | FUTURE_REQUIREMENT | Aún no hay ejecución LLM. |
| **Indirect prompt injection** | FUTURE_REQUIREMENT | Aún no hay ejecución LLM. |
| **SSRF** | NO_CURRENT_SURFACE / FUTURE_REQUIREMENT | Sin fetch controlado por modelo actualmente. |
| **Data exfiltration** | NO_CURRENT_SURFACE / FUTURE_REQUIREMENT | - |
| **Model output trust** | FUTURE_REQUIREMENT | - |
| **Hallucinated citations** | FUTURE_REQUIREMENT | - |
| **Authorization / Isolation** | FUTURE_REQUIREMENT | - |
