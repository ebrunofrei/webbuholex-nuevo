// ============================================================
// 🦉 BÚHOLEX | Script de Reparación de Especialidades (módulo dual)
// ============================================================
// Analiza todas las noticias existentes en MongoDB y asigna
// automáticamente una especialidad coherente según su contenido.
// Puede ejecutarse manualmente o importarse desde cronNoticias.js
// ============================================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import chalk from "chalk";
import { Noticia } from "../backend/models/Noticia.js";

dotenv.config({ path: ".env.development" });

// ============================================================
// 🧠 Detección automática de especialidad
// ============================================================
function inferirEspecialidad(noticia = {}) {
  const texto = `${noticia.titulo || ""} ${noticia.resumen || ""} ${noticia.contenido || ""}`.toLowerCase();

  if (texto.includes("penal") || texto.includes("delito") || texto.includes("fiscal")) return "penal";
  if (texto.includes("civil") || texto.includes("contrato") || texto.includes("propiedad")) return "civil";
  if (texto.includes("laboral") || texto.includes("trabajador") || texto.includes("sindicato")) return "laboral";
  if (texto.includes("constitucional") || texto.includes("tribunal constitucional") || texto.includes("amparo")) return "constitucional";
  if (texto.includes("familiar") || texto.includes("hijo") || texto.includes("matrimonio")) return "familiar";
  if (texto.includes("administrativo") || texto.includes("resolución") || texto.includes("procedimiento administrativo")) return "administrativo";
  if (texto.includes("ambiental") || texto.includes("medio ambiente")) return "ambiental";
  if (texto.includes("registral") || texto.includes("sunarp")) return "registral";
  if (texto.includes("notarial")) return "notarial";
  if (texto.includes("tributario") || texto.includes("impuesto")) return "tributario";
  return "general";
}

// ============================================================
// 🧩 Función principal exportable
// ============================================================
export async function repararEspecialidades() {
  try {
    console.log(chalk.cyan("\n🧠 Iniciando reparación automática de especialidades..."));
    await mongoose.connect(process.env.MONGO_URI);
    console.log(chalk.green("✅ Conectado correctamente a MongoDB."));

    const noticias = await Noticia.find().lean();
    let actualizadas = 0;

    for (const n of noticias) {
      const actual = (n.especialidad || "").trim().toLowerCase();
      if (!actual || actual === "general") {
        const nueva = inferirEspecialidad(n);
        if (nueva !== "general") {
          await Noticia.updateOne({ _id: n._id }, { $set: { especialidad: nueva } });
          actualizadas++;
          console.log(`🩹 ${nueva.toUpperCase()} → ${n.titulo.slice(0, 60)}...`);
        }
      }
    }

    console.log(chalk.greenBright(`✅ Reparación completada: ${actualizadas} noticias actualizadas.`));
    await mongoose.disconnect();
    console.log(chalk.gray("🔌 Conexión MongoDB cerrada."));
  } catch (err) {
    console.error(chalk.red("❌ Error al reparar especialidades:"), err);
  }
}

// ============================================================
// 🧰 Ejecución manual directa
// ============================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(chalk.gray("🧩 Ejecución manual de fix-especialidades.js iniciada..."));
  repararEspecialidades()
    .then(() => {
      console.log(chalk.green("🏁 Reparación completada correctamente."));
      process.exit(0);
    })
    .catch((err) => {
      console.error(chalk.red("❌ Error fatal:"), err);
      process.exit(1);
    });
}
