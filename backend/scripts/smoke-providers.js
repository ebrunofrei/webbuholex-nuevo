// backend/scripts/smoke-providers.js
import gaceta   from "../services/newsProviders/gacetaJuridicaProvider.js";
import jnj      from "../services/newsProviders/jnjProvider.js";
import legis    from "../services/newsProviders/legisPeProvider.js";
import sunarp   from "../services/newsProviders/sunarpProvider.js";
import oea      from "../services/newsProviders/oeaProvider.js";
import onu      from "../services/newsProviders/onuProvider.js";
import corteIDH from "../services/newsProviders/corteIDHProvider.js";

async function run() {
  const tests = [
    ["Gaceta Jurídica", gaceta],
    ["JNJ", jnj],
    ["Legis.pe", legis],
    ["SUNARP (RSS)", sunarp],
    ["OEA", oea],
    ["ONU", onu],
    ["Corte IDH", corteIDH],
  ];

  for (const [name, fn] of tests) {
    try {
      const items = await fn({ limit: 5 }); // si tu provider acepta limit
      console.log(`✔ ${name}: ${items.length} items`);
      console.log(items.slice(0, 2)); // muestra 2 de ejemplo
    } catch (e) {
      console.error(`✖ ${name}:`, e?.message || e);
    }
  }
}

run();
