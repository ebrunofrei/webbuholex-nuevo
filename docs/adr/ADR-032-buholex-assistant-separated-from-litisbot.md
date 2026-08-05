# ADR 032: Separación de Identidad del Asistente Jurídico BúhoLex vs LitisBot

## Fecha
2026-07-30

## Estado
Aceptado

## Contexto
Originalmente, la interfaz del "Espacio Inteligente" de BúhoLex promocionaba y presentaba a LitisBot como el asistente central de la firma. Esto generaba confusión de marca e identidad, ya que LitisBot está concebido como una plataforma LegalTech o SaaS independiente con sus propias capacidades, mientras que BúhoLex requiere un asistente institucional orientado a guiar a sus clientes y derivarlos a servicios legales.

## Decisión
Se ha decidido separar de manera estricta la identidad del "Asistente Jurídico BúhoLex" respecto de LitisBot:
1. El portal de BúhoLex y su ruta `/asistente/` alojarán exclusivamente la identidad del **Asistente Jurídico BúhoLex**.
2. **LitisBot** operará como una plataforma independiente, sin ser anunciada ni mencionada en el home público de BúhoLex, ni servirá como el asistente integrado.

## Consecuencias
- **Positivas**: Evita expectativas incorrectas sobre el rol de BúhoLex y resguarda la marca LitisBot para un uso independiente, posiblemente comercializable como SaaS.
- **Negativas**: Obliga a mantener dos enfoques de desarrollo para asistentes o chatbots (uno institucional y otro de procesamiento SaaS).
- **Riesgos Mitigados**: Se evita comprometer legalmente al bufete (BúhoLex) con el procesamiento de un software independiente que pudiera generar falsas respuestas sin revisión. El Asistente Jurídico BúhoLex tendrá explícitamente barreras y disclaimers de limitación de responsabilidad ("No sustituye evaluación profesional").
