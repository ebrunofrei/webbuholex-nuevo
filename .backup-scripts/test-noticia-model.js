import { connectDB, disconnectDB } from "../backend/services/db.js";
import { Noticia } from "../backend/models/Noticia.js";

await connectDB();

const count = await Noticia.countDocuments();
console.log(`🗞️ Total noticias registradas: ${count}`);

const juridicas = await Noticia.countDocuments({ tipo: "juridica" });
console.log(`⚖️ Noticias jurídicas: ${juridicas}`);

await disconnectDB();
process.exit(0);
