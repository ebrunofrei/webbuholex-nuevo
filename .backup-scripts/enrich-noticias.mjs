// scripts/enrich-noticias.mjs
import mongoose from "mongoose";
import { resolveImageForItem, getOgImage, getFaviconFrom } from "../backend/services/mediaEnrichment.js";
import Noticia from "../backend/models/Noticia.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/buholex";

await mongoose.connect(MONGODB_URI);
const cursor = Noticia.find({
  $or: [{ imagenResuelta: { $in: [null, ""] } }, { imagenResuelta: { $exists: false } }],
}).cursor();

let ok = 0, fail = 0;
for await (const n of cursor) {
  try {
    const enlace = n.enlace || n.url || n.link || "";
    const resolved = await resolveImageForItem(n);
    const og = enlace ? await getOgImage(enlace) : "";
    const fav = enlace ? getFaviconFrom(enlace) : "";
    n.imagenOg = og;
    n.imagenFavicon = fav;
    n.imagenResuelta = resolved || og || fav || "";
    await n.save();
    ok++;
  } catch {
    fail++;
  }
}

console.log("Enrichment done:", { ok, fail });
await mongoose.disconnect();
