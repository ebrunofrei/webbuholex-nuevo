// backend/services/newsProviders/rssRegistry.js
import { fetchFromRss } from "./rssProvider.js";

export const RSS_SOURCES = [
  // =============================
  // ONU – LAW & CRIME PREVENTION
  // =============================
  {
    id: "un-law",
    nombre: "ONU – Law & Crime Prevention",
    rssUrls: [
      "https://news.un.org/feed/subscribe/en/news/topic/law-and-crime-prevention/rss.xml",
    ],
    idioma: "en",
    categoriaPorDefecto: ["internacional", "derecho-internacional"],
  },

  // =============================
  // ONU – HUMAN RIGHTS
  // =============================
  {
    id: "un-hr",
    nombre: "ONU – Human Rights",
    rssUrls: [
      "https://news.un.org/feed/subscribe/en/news/topic/human-rights/rss.xml",
    ],
    idioma: "en",
    categoriaPorDefecto: ["internacional", "derechos-humanos"],
  },

  // =============================
  // CORTE PENAL INTERNACIONAL (ICC)
  // =============================
  {
    id: "icc",
    nombre: "Corte Penal Internacional (ICC)",
    rssUrls: [
      "https://www.icc-cpi.int/rss.xml", // ESTE ES EL FEED VÁLIDO
    ],
    idioma: "en",
    categoriaPorDefecto: ["internacional", "penal"],
  },
];

export async function collectAllRss() {
  const out = [];

  for (const cfg of RSS_SOURCES) {
    try {
      const items = await fetchFromRss(cfg);
      out.push(...items);
    } catch (err) {
      console.error("Error collecting RSS from:", cfg.id, err);
    }
  }

  return out;
}
