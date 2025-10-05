import mongoose from "mongoose";
import dotenv from "dotenv";
import { Noticia } from "../models/Noticia.js";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const noticiasDemo = [
  {
    titulo: "ONU alerta sobre crisis climática global",
    resumen: "Naciones Unidas advierte sobre el rápido aumento de temperaturas y sus consecuencias sociales.",
    tipo: "general",
    especialidad: "ciencia",
    fuente: "ONU Noticias",
    fecha: new Date(),
    url: "https://news.un.org/es",
    imagen: "https://news.un.org/themes/custom/un_newsroom/img/socialshare-default.jpg",
  },
  {
    titulo: "Corte Suprema aprueba nueva directiva procesal",
    resumen: "El Poder Judicial publicó una nueva directiva sobre procesos constitucionales.",
    tipo: "juridica",
    especialidad: "constitucional",
    fuente: "Poder Judicial del Perú",
    fecha: new Date(),
    url: "https://www.pj.gob.pe",
    imagen: "https://www.pj.gob.pe/wps/themes/html/pjtheme/images/logo.png",
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado a MongoDB");
    await Noticia.deleteMany({});
    await Noticia.insertMany(noticiasDemo);
    console.log("✅ Noticias insertadas correctamente");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al insertar noticias:", err);
    process.exit(1);
  }
}

seed();
