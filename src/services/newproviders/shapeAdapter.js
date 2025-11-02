// ============================================================
// 🧩 Adaptador de forma para normalizar entradas heterogéneas
// ============================================================
// Toma cualquier "json" proveniente del backend y lo convierte
// a una lista simple de objetos con los campos mínimos que
// necesita normalizeNoticia / normalizeNoticias.
// ============================================================

/**
 * Devuelve SIEMPRE un array base desde json:
 * - [ ... ]
 * - { items: [...] }
 * - { data: [...] }
 * - { results: [...] }
 * - { docs: [...] }
 */
export function extractArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  if (Array.isArray(json?.docs)) return json.docs;
  // Estructuras más raras: { ok:true, items:[...] } etc.
  if (json && typeof json === "object") {
    const firstArray = Object.values(json).find(Array.isArray);
    if (Array.isArray(firstArray)) return firstArray;
  }
  return [];
}

/**
 * Adapta cada item a la forma que espera normalizeNoticia:
 * {
 *   id, titulo, resumen, contenido, fuente, url, imagen, fecha, tipo, especialidad
 * }
 * No limpia ni clasifica; eso lo hace normalizeNoticia.
 */
export function adaptToNormalizeInput(arr = []) {
  return arr.map((n, i) => ({
    id: n?._id || n?.id || n?.guid || n?.uid || i,
    titulo: n?.titulo || n?.title || n?.headline || "",
    resumen: n?.resumen || n?.description || n?.snippet || n?.extracto || "",
    contenido: n?.contenido || n?.content || n?.texto || n?.body || "",
    fuente: n?.fuente || n?.source || n?.provider || "",
    url: n?.enlace || n?.url || n?.link || "#",
    imagen: n?.imagen || n?.image || n?.imageUrl || n?.thumbnail || null,
    fecha: n?.fecha || n?.date || n?.publishedAt || n?.createdAt || null,
    tipo: n?.tipo || "",            // se decide en normalizeNoticia si viene vacío
    especialidad: n?.especialidad || n?.area || "", // idem
  }));
}
