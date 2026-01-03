import { collectAllRss } from "./newsProviders/rssRegistry.js";
import Noticia from "../models/Noticia.js";
import { dbConnect, dbDisconnect } from "../services/db.js";

export async function ingestRssNews() {
  await dbConnect();

  const items = await collectAllRss();

  let inserted = 0;
  for (const item of items) {
    if (!item.titulo || !item.enlace) continue;

    const exists = await Noticia.findOne({ enlace: item.enlace });
    if (exists) continue;

    await Noticia.create({
      ...item,
      resumen: "",
      tipo: "juridica",
    });

    inserted++;
  }

  console.log(`🟢 [RSS-PJ] Noticias nuevas insertadas: ${inserted}`);

  await dbDisconnect();
}
