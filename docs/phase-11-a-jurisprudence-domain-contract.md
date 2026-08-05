# Fase 11.A — Contrato del dominio jurisprudencial

## Propósito y límites

`JurisprudenceRecord` es el contrato editorial interno para describir una resolución con identidad, trazabilidad, contenido diferenciado, autoridad jurídica y controles de publicación. No es una entidad persistida, una respuesta HTTP ni una afirmación de que exista una base conectada.

Esta fase define tipos, validaciones, normalización de consulta y proyecciones puras. No implementa base de datos, repositorio, API, ingesta, archivos, búsqueda real, IA, autenticación ni publicación.

## Glosario

- **Registro canónico:** representación interna completa y trazable.
- **Contenido oficial:** texto o sumilla cuya procedencia corresponde a la resolución o fuente oficial.
- **Contenido editorial:** título, resumen, extracto, problema y criterio elaborados o seleccionados por BúhoLex; nunca se presentan automáticamente como texto oficial.
- **Contenido generado:** borrador interno producido por una capacidad automatizada futura. No es fuente.
- **Fuente identificable:** URL, identificador documental o referencia de evidencia suficiente para localizar el respaldo.
- **Proyección pública:** subconjunto explícito y seguro derivado de un registro publicable.
- **Autoridad jurídica:** efecto o fuerza atribuida con evidencia; no equivale al tipo de resolución.

## Modelo canónico

### Obligatorios

- identidad estable: `id`, versión positiva, estados y marcas temporales;
- identificación: expediente, resolución, tipo, institución, órgano, instancia, especialidad, materia, sala/juzgado/tribunal y fecha de emisión;
- título editorial;
- estado de disponibilidad documental, formato e idioma;
- clasificación de resolución, autoridad y vigencia, aunque sean `unknown`;
- fuente con tipo y nombre;
- clasificación normalizada de búsqueda;
- controles internos y separación de contenido generado.

### Opcionales o anulables

- slug público;
- submateria, distrito, ponente y fecha de publicación oficial;
- sumilla oficial y texto oficial completo;
- resumen, extracto, problema, criterio y decisión editoriales;
- páginas, URL, identificador documental, checksum y fechas de recuperación;
- archivo oficial futuro y su ubicación privada;
- evidencias de autoridad y vigencia cuando el estado sea desconocido.

Los campos opcionales se representan de manera explícita con `null` en el registro. En consultas, los filtros ausentes se normalizan a `undefined`.

## Separación de contenidos

El registro contiene tres ramas que no deben fusionarse:

1. `officialContent`: sumilla, texto oficial, disponibilidad, permiso de exposición, formato, idioma y páginas.
2. `editorialContent`: título, resumen, extracto, problema jurídico, criterio, fundamentos, decisión, normas, relaciones y palabras clave.
3. `generatedContent`: borrador interno, estado de revisión y respaldo en fuente.

Un borrador generado no puede convertirse en fuente oficial. La proyección pública nunca incluye `generatedContent`.

## Estados controlados

### Editorial

`draft`, `under_review`, `verified`, `rejected`, `archived`.

`verified` es el único estado editorial habilitante para publicación. No significa por sí solo que el registro esté publicado.

### Publicación

`private`, `editorial_preview`, `published`, `unpublished`, `withdrawn`.

Solo `published`, junto con todos los demás controles, permite una proyección pública.

### Verificación de fuente

`unverified`, `source_located`, `partially_verified`, `verified`, `disputed`.

Una fuente `verified` exige fecha y al menos URL, identificador documental o referencia de evidencia.

### Disponibilidad documental

`metadata_only`, `excerpt_available`, `full_text_available`, `official_file_available`, `unavailable`.

El estado informa qué existe; no concede por sí mismo autorización pública.

### Tipo de fuente

`official_judiciary`, `constitutional_court`, `government_platform`, `official_gazette`, `editorial_upload`, `other_official_source`.

No existe un valor para blogs, doctrina o contenido generado. `editorial_upload` exige evidencia y revisión; no convierte una carga en fuente oficial por sí sola.

### Autoridad y vigencia

La categoría de resolución (`ordinary_decision`, `cassation`, `plenary_cassation`, `plenary_agreement`, `constitutional_judgment`, `other`) se separa de la autoridad (`ordinary`, `persuasive`, `binding_precedent`, `plenary_decision`, `constitutional_precedent`, `unknown`) y de la vigencia (`current`, `modified`, `superseded`, `contradicted`, `unknown`).

Toda autoridad distinta de `unknown` requiere evidencia y fecha de verificación. Toda vigencia distinta de `unknown` requiere evidencia. Esto evita que un booleano ambiguo afirme fuerza vinculante.

## Fuente y trazabilidad

La URL es anulable porque una carga editorial autorizada puede carecer de URL pública. Sin embargo, un registro no puede considerarse verificado si no conserva al menos una evidencia identificable. `verifiedBy` y las notas son internas y se excluyen de toda proyección pública.

Los checksums se modelan como SHA-256 futuro. No se calculan ni inventan en 11.A.

## Contrato futuro de archivo

`officialFile` solo describe el contrato: disponibilidad, nombre original, MIME, tamaño, checksum, ubicación privada y autorización pública. La ubicación debe ser relativa, no pertenecer a `public/`, no ser URL y no ser ruta absoluta. No se almacena ningún archivo en esta fase.

Un archivo marcado disponible requiere metadatos. El acceso público exige autorización fechada. Conforme al criterio conservador de 11.A, un registro que posee un archivo real no autorizado queda bloqueado para publicación.

## Clasificación y búsqueda

`JurisprudenceSearchInput` admite consulta libre, expediente, resolución, materia, submateria, órgano, instancia, distrito, tipo, rango de fechas, autoridad, página, tamaño y orden.

Reglas:

- colapsar espacios y retirar filtros vacíos;
- objeto estricto, sin propiedades desconocidas;
- `page >= 1`;
- `1 <= pageSize <= 50`, con valor inicial 20;
- `fechaDesde <= fechaHasta`;
- orden limitado a relevancia, fecha ascendente/descendente y relevancia editorial.

El contrato no ejecuta consultas ni define un índice. `normalizedSearchText`, materias, órganos, jurisdicción, etiquetas y relevancia editorial quedan listos para una fase posterior.

`JurisprudenceSearchResult` distingue elementos, total, página, tamaño, páginas totales, filtros aplicados, orden, estado de datos y fecha de generación. Su existencia tipada no implica que haya resultados disponibles.

## Proyecciones públicas

### `JurisprudenceSearchItem`

Incluye identidad, título, expediente, resolución, órgano, materia, fecha, resumen permitido, autoridad verificada, disponibilidad, fuente pública y verificación.

### `JurisprudenceDetail`

Amplía la tarjeta con institución, especialidad, clasificación, contenidos oficiales autorizados, contenidos editoriales, referencias y vigencia.

Nunca incluyen:

- `verifiedBy`;
- notas o contradicciones internas;
- ubicación privada;
- borradores generados;
- decisiones operativas o de auditoría.

## Reglas de publicación

`getJurisprudencePublicationBlockers` devuelve bloqueos estructurados. `isJurisprudenceRecordPublic` exige un registro válido y cero bloqueos. Las funciones `toPublicJurisprudenceSearchItem` y `toPublicJurisprudenceDetail` devuelven `null` cuando el registro no es publicable.

Bloqueos:

- fuente no identificable;
- fuente no verificada;
- publicación distinta de `published`;
- estado editorial distinto de `verified`;
- identificación jurídica incompleta;
- contradicción crítica;
- contenido generado sin revisión y respaldo;
- archivo oficial existente sin autorización pública.

Un registro de metadatos puede ser publicable si declara honestamente su disponibilidad y cumple los controles. Nunca se presenta como resolución íntegra.

## Privacidad y datos personales

- Una resolución oficial puede contener nombres y otros datos personales.
- La existencia de una fuente no autoriza automáticamente su republicación por BúhoLex.
- Las partes procesales no son campos obligatorios ni filtros públicos del contrato.
- No se permitirá buscar por DNI, domicilio, teléfono, correo u otros identificadores personales.
- No se almacenarán datos adicionales ajenos a la fuente ni se enriquecerán perfiles de litigantes.
- No se inferirán atributos sensibles.
- La minimización, anonimización y base jurídica del tratamiento requieren una política posterior; no se automatizan en 11.A.

## Decisiones diferidas para 11.B

1. Elegir persistencia y modelo físico.
2. Definir repositorio, puertos y transacciones.
3. Resolver identificadores externos, versiones y deduplicación.
4. Diseñar ingesta autorizada y cadena de custodia.
5. Aprobar política de datos personales.
6. Definir roles editoriales y evidencia de revisión.
7. Diseñar API interna y, posteriormente, pública.
8. Definir índice, ranking, paginación estable y límites.
9. Establecer almacenamiento privado y permisos de archivos.
10. Migrar la interfaz solo cuando exista un repositorio real y verificable.

## No implementado

No hay base de datos, endpoint, API, repositorio, scraping, carga, archivo, búsqueda full-text, IA, resultado real, autenticación, panel editorial, publicación ni despliegue.
