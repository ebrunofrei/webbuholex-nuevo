// Ejecuta: node scripts/seed-noticias.js
import mongoose from "mongoose";
import Noticia from "../backend/models/Noticia.js";

const MONGO = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/buholex";

const hoy = new Date();
const mk = (over = {}) => ({
  tipo: "juridica",
  titulo: "Ejemplo de noticia jurídica",
  resumen: "Resumen de ejemplo para validar filtros de especialidad.",
  enlace: `https://example.com/${Math.random().toString(36).slice(2)}`,
  fuente: "Fuente Demo",
  proveedor: "Proveedor Demo",
  imagen: "",
  lang: "es",
  fecha: new Date(hoy.getTime() - Math.floor(Math.random()*10)*86400000),
  especialidadSlug: "penal",
  tags: ["penal"],
  raw: {},
  ...over,
});

const ESPS = ["penal", "civil", "laboral"];

async function run() {
  await mongoose.connect(MONGO, { family: 4 });
  console.log("Conectado:", MONGO);

  const docs = [];
  for (const esp of ESPS) {
    for (let i = 0; i < 10; i++) {
      docs.push(mk({
        titulo: `(${esp.toUpperCase()}) Noticia #${i+1}`,
        especialidadSlug: esp,
        tags: [esp],
        proveedor: `Proveedor ${esp}`,
      }));
    }
  }

  await Noticia.insertMany(docs, { ordered: false });
  console.log(`Insertadas ${docs.length} noticias de demo.`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
