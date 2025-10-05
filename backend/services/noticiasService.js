// ============================================================
// 🦉 BÚHOLEX | Servicio de Noticias (versión final unificada)
// ============================================================
// Inserta, actualiza, consulta y limpia noticias en MongoDB.
// Clasifica entre noticias jurídicas y generales de forma automática.
// Compatible con frontend público y Oficina Virtual.
// ============================================================

import { Noticia } from "../models/Noticia.js";
import chalk from "chalk";

// ============================================================
// 🧠 Detección semántica automática de especialidad
// ============================================================
function inferirEspecialidad(noticia = {}) {
  const texto = `${noticia.titulo || ""} ${noticia.resumen || ""} ${noticia.contenido || ""}`.toLowerCase();

  if (texto.includes("penal") || texto.includes("delito") || texto.includes("fiscalía"))
    return "penal";
  if (texto.includes("civil") || texto.includes("contrato") || texto.includes("propiedad"))
    return "civil";
  if (texto.includes("laboral") || texto.includes("trabajador") || texto.includes("sindicato"))
    return "laboral";
  if (
    texto.includes("constitucional") ||
    texto.includes("tribunal constitucional") ||
    texto.includes("amparo")
  )
    return "constitucional";
  if (texto.includes("familiar") || texto.includes("hijo") || texto.includes("matrimonio"))
    return "familiar";
  if (
    texto.includes("administrativo") ||
    texto.includes("procedimiento administrativo") ||
    texto.includes("resolución directoral")
  )
    return "administrativo";
  if (texto.includes("ambiental") || texto.includes("medio ambiente"))
    return "ambiental";
  if (texto.includes("registral") || texto.includes("sunarp"))
    return "registral";
  if (texto.includes("notarial"))
    return "notarial";
  if (texto.includes("tributario") || texto.includes("impuesto"))
    return "tributario";

  return "general";
}

// ============================================================
// 🧩 Inserta o actualiza noticias (modo upsert optimizado)
// ============================================================
export async function upsertNoticias(noticias = []) {
  if (!Array.isArray(noticias) || noticias.length === 0) {
    console.log(chalk.yellow("⚠️ No se recibieron noticias para guardar."));
    return { inserted: 0, updated: 0, skipped: 0, total: 0 };
  }

  const ops = [];
  let skipped = 0;
  const urlsVistas = new Set();

  for (const n of noticias) {
    const url = n.url?.trim();
    const titulo = n.titulo?.trim();
    if (!url || !titulo) {
      skipped++;
      continue;
    }
    if (urlsVistas.has(url)) {
      skipped++;
      continue;
    }
    urlsVistas.add(url);

    // 🔍 Detección de especialidad
    const especialidadNormalizada =
      n.especialidad?.toString().trim().toLowerCase() || inferirEspecialidad(n);

    // ⚖️ Detección de tipo
    const tipoDetectado = (() => {
      const fuente = (n.fuente || "").toLowerCase();
      if (
        fuente.includes("poder judicial") ||
        fuente.includes("gaceta") ||
        fuente.includes("tribunal constitucional") ||
        fuente.includes("sunarp") ||
        fuente.includes("jnj") ||
        fuente.includes("legis") ||
        fuente.includes("corte idh") ||
        fuente.includes("cij") ||
        fuente.includes("tjue") ||
        fuente.includes("oea") ||
        fuente.includes("diario oficial") ||
        fuente.includes("ministerio público")
      ) {
        return "juridica";
      }
      return n.tipo?.trim().toLowerCase() || "general";
    })();

    ops.push({
      updateOne: {
        filter: { url },
        update: {
          $setOnInsert: {
            createdAt: new Date(),
            fuente: n.fuente || "Desconocida",
          },
          $set: {
            titulo,
            resumen: n.resumen?.trim() || "Sin resumen disponible.",
            contenido: n.contenido?.trim() || "",
            imagen: n.imagen || "/assets/default-news.jpg",
            tipo: tipoDetectado,
            especialidad: especialidadNormalizada,
            fecha: n.fecha ? new Date(n.fecha) : new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length === 0) {
    console.log(chalk.red("❌ No se generaron operaciones válidas de guardado."));
    return { inserted: 0, updated: 0, skipped, total: 0 };
  }

  try {
    const result = await Noticia.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount || 0;
    const updated = result.modifiedCount || 0;
    const total = inserted + updated + skipped;
    console.log(
      chalk.green(
        `✅ Noticias procesadas: ${total} | Nuevas: ${inserted} | Actualizadas: ${updated} | Omitidas: ${skipped}`
      )
    );
    return { inserted, updated, skipped, total };
  } catch (err) {
    console.error(chalk.red("❌ Error en upsertNoticias:"), err.message);
    return { inserted: 0, updated: 0, skipped: noticias.length, total: noticias.length };
  }
}

// ============================================================
// 📚 Obtiene noticias filtradas por tipo, especialidad y paginación
// ============================================================
export async function getNoticias({ tipo = "general", especialidad = "todas", page = 1, limit = 12 } = {}) {
  const query = {};

  // --- Filtros por tipo ---
  if (tipo) {
    if (tipo === "general") {
      // ✅ Abarca todas las variantes usadas en BD
      query.tipo = { $in: ["general", "generales", "internacional", "tecnologia", "tecnología", null, ""] };
    } else if (tipo === "juridica" || tipo === "juridicas") {
      query.tipo = { $in: ["juridica", "juridicas", "legal", "jurídica", "jurídicas"] };
    }
  }

  // --- Filtro por especialidad ---
  if (especialidad && especialidad !== "todas") {
    query.especialidad = { $regex: new RegExp(`^${especialidad}$`, "i") };
  }

  const skip = (Number(page) - 1) * Number(limit);

  try {
    const noticias = await Noticia.find(query, {
      titulo: 1,
      resumen: 1,
      contenido: 1,
      fuente: 1,
      url: 1,
      imagen: 1,
      tipo: 1,
      especialidad: 1,
      fecha: 1,
    })
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const normalizadas = (noticias || []).map((n, i) => ({
      id: n._id?.toString() || `noticia-${i}`,
      titulo: n.titulo || "Sin título",
      resumen: n.resumen || "Sin resumen disponible.",
      contenido: n.contenido || "",
      imagen: n.imagen || "/assets/default-news.jpg",
      enlace: n.url || "",
      fuente: n.fuente || "Fuente desconocida",
      tipo: n.tipo || "general",
      especialidad: n.especialidad || "general",
      fecha: n.fecha || new Date(),
    }));

    console.log(
      chalk.cyan(
        `📰 ${normalizadas.length} noticias obtenidas (${tipo || "todas"} | ${especialidad || "todas"})`
      )
    );

    return {
      ok: true,
      tipo,
      especialidad,
      total: normalizadas.length,
      hasMore: normalizadas.length >= limit,
      items: normalizadas,
    };
  } catch (err) {
    console.error(chalk.red("❌ Error al obtener noticias:"), err.message);
    return {
      ok: false,
      tipo,
      especialidad,
      total: 0,
      hasMore: false,
      items: [],
      error: err.message,
    };
  }
}

// ============================================================
// 🧽 Elimina duplicados por URL o título
// ============================================================
export async function limpiarDuplicados() {
  console.log(chalk.gray("🧹 Buscando duplicados en colección de noticias..."));

  const duplicados = await Noticia.aggregate([
    {
      $group: {
        _id: "$url",
        ids: { $addToSet: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let eliminadas = 0;
  for (const d of duplicados) {
    d.ids.shift();
    eliminadas += d.ids.length;
    await Noticia.deleteMany({ _id: { $in: d.ids } });
  }

  console.log(chalk.green(`🧽 Duplicados eliminados: ${eliminadas}`));
  return eliminadas;
}
