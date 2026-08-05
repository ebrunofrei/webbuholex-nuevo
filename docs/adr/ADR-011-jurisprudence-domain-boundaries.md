# ADR-011 — Límites del dominio jurisprudencial

- Estado: aceptado para Fase 11.A
- Fecha: 2026-07-29

## Contexto

BúhoLex ya describe una experiencia cognitiva futura y muestra una interfaz pública sin resultados. Faltaba un contrato editorial capaz de controlar identidad, fuente, verificación, publicación, autoridad y exposición pública antes de elegir persistencia o conectar datos.

## Decisión

Se adopta `JurisprudenceRecord` como registro canónico interno. Se conserva `JurisprudenceDocument` como contrato del flujo cognitivo. Los tipos canónicos viven junto a los existentes en `types/jurisprudence.ts`; sus esquemas se integran en `lib/schemas/jurisprudence.ts`; las reglas puras viven en `lib/jurisprudence-domain.ts`.

El registro interno y sus proyecciones públicas son contratos distintos. El contenido se divide en oficial, editorial y generado. La publicación exige fuente identificable y verificada, aprobación editorial equivalente a `verified`, estado `published`, identificación suficiente y ausencia de bloqueos.

## Alternativas consideradas

### Usar directamente `JurisprudenceDocument`

Rechazada. Ese contrato sirve a lectura estructurada, citas y agentes; no modela ciclo editorial, publicación, archivos privados ni proyección pública.

### Extender el antiguo `JurisprudenceItem`

Rechazada. Era una interfaz mínima sin uso, trazabilidad suficiente ni controles. Mantenerla habría creado dos proyecciones públicas incompatibles.

### Crear inmediatamente tablas y ORM

Diferida. Sin decisiones sobre ingesta, versionado, deduplicación, privacidad y archivos, una base de datos fijaría prematuramente supuestos jurídicos y operativos.

### Usar una única estructura para almacenamiento y API

Rechazada. Expondría notas, responsables, rutas y controles internos o exigiría filtrados implícitos difíciles de auditar.

### Unificar texto oficial y resumen

Rechazada. Impediría distinguir lo emitido por el órgano de lo redactado o generado por BúhoLex.

### Implementar scraping para obtener casos de prueba

Rechazada. No existe autorización ni política operativa aprobada; además, generaría datos antes de cerrar fuente, privacidad e ingesta.

## Consecuencias

### Positivas

- trazabilidad obligatoria sin exigir URL pública;
- estados editoriales, de publicación y verificación independientes;
- autoridad jurídica respaldada y no ambigua;
- proyecciones públicas por lista blanca;
- reglas puras testeables sin infraestructura;
- continuidad con los contratos cognitivos previos;
- imposibilidad contractual de convertir contenido generado en fuente.

### Costes

- el modelo es más explícito y extenso;
- persistencia futura deberá mapear objetos y estados;
- se requerirá migración cuidadosa entre documentos cognitivos y registros canónicos;
- un archivo privado no autorizado bloquea conservadoramente la publicación hasta definir una política más granular.

## Riesgos

- interpretar `verified` como pronunciamiento sobre vigencia material y no como control editorial;
- asignar autoridad sin evidencia suficiente;
- publicar datos personales por reproducción automática;
- divergencia futura entre índice y registro canónico;
- duplicación si no se define una clave institucional estable;
- exponer texto completo sin autorización por confundir disponibilidad con permiso.

## Decisiones pendientes

- persistencia, repositorio y versionado físico;
- identificación y deduplicación institucional;
- roles y flujo de aprobación;
- ingesta, almacenamiento y cadena de custodia;
- datos personales y anonimización;
- API, búsqueda, ranking y límites;
- matriz de autoridad por órgano y clase de resolución;
- reglas de republicación de texto y archivos.

## Límites explícitos

Este ADR no autoriza base de datos, API, scraping, ingesta, archivos, IA, autenticación, publicación ni despliegue.
