# System Overview

Este documento describe la arquitectura vigente del sistema BúhoLex, omitiendo el historial de fases previas para centrarse en el estado actual.

## Tecnologías Principales

- **Frontend / Framework:** Next.js, React, TypeScript.
- **Base de Datos:** PostgreSQL (alojado en Supabase).
- **ORM / Query Builder:** Drizzle ORM.
- **Validación:** Zod.
- **Testing:** Vitest.

## Zonas del Sistema

### Zona Pública
Interfaces accesibles sin autenticación. Incluye Inicio, Servicios, Nosotros, Consulta Profesional, Jurisprudencia y Explorar.

### Jurisprudencia
El núcleo de datos legales. Se estructura con fronteras claras entre el cliente y el servidor, con exposición controlada mediante un pipeline de publicación y un gateway de búsqueda.

### Owl
Owl es el bounded context actual para la experiencia de análisis jurídico. Su flujo productivo actual termina en una orquestación simulada y no ejecuta un LLM real.

### Hermes [PLANNED]
Hermes es únicamente el nombre arquitectónico de trabajo utilizado para diseñar futuras capacidades de ejecución/orquestación dentro de la evolución de Owl. No existe actualmente un bounded context Hermes separado. NAMING_MIGRATION_REQUIRED = NO.

## Estado de Despliegue
- **Production:** FROZEN
- **STAGING:** En uso para validación de migraciones y QA interno.

## Principios Arquitectónicos
- **Separación de Dominio / Aplicación / Infraestructura:** Existen límites observados entre los módulos de dominio (`lib/jurisprudence-domain.ts`) y la infraestructura (repositorios/gateways).
- **Feature Switches:** Determinadas capacidades sensibles del runtime emplean configuración explícita y comportamiento fail-closed antes de su activación.
