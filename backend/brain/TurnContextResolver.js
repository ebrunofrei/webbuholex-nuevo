// ============================================================================
// 🧬 TurnContextResolver — R7.3 (2026)
// Ontología Jerárquica + Afinidad Dinámica + Persistence Boost + TTL + Anti-Drift
// ----------------------------------------------------------------------------
// - No limita ramas del Derecho (universal).
// - Mantiene continuidad cognitiva sin arrastre tóxico.
// - Evita resets falsos y evita "drift temático".
// - Modelo robusto para jurista cognitivo (LITISBOT).
// ============================================================================

// ----------------------------------------------
// 1) ONTOLOGÍA JERÁRQUICA (ampliable, no restrictiva)
// ----------------------------------------------
const ONTOLOGY = {
  dominio: {
    penal: /\b(penal|delito|acusación|imputado|tipicidad|cohecho|estafa)\b/i,
    civil: /\b(civil|obligaciones|daños|familia|responsabilidad)\b/i,
    laboral: /\b(laboral|despido|hostigamiento|cts|planilla)\b/i,
    admin: /\b(administrativo|acto administrativo|tupa|silencio positivo)\b/i,
    compliance: /\b(compliance|corrupción|lavado|debida diligencia)\b/i,
    legaltech: /\b(blockchain|smart contract|token|firma digital|algoritmo)\b/i,
    bioetica: /\b(bioética|consentimiento informado|genoma|eutanasia)\b/i,
  },

  objeto: {
    sentencia: /\b(sentencia|fallo|resolución|laudo|ejecutoria)\b/i,
    contrato: /\b(contrato|acuerdo|cláusula|convenio|mou)\b/i,
    medida: /\b(cautelar|embargo|secuestro conservativo|medida)\b/i,
    expediente: /\b(expediente|folios|escrito|actuados|providencia)\b/i,
    prueba: /\b(prueba|pericia|indicio|dictamen|informe pericial)\b/i,
  },

  proceso: {
    impugnacion: /\b(apelación|recurso|nulidad|casación|impugnar)\b/i,
    plazo: /\b(plazo|caducidad|término|prescripción)\b/i,
    actuacion: /\b(notificación|traslado|providencia|auto)\b/i,
  },

  hard_reset: /\b(nuevo caso|reset|olvida lo anterior|empecemos de cero)\b/i,
};

// ----------------------------------------------
// 2) Extraer Tags Jerárquicos
// ----------------------------------------------
function extractHierTags(text = "") {
  const t = text.toLowerCase();
  const tags = { dominio: [], objeto: [], proceso: [] };

  for (const k in ONTOLOGY.dominio) if (ONTOLOGY.dominio[k].test(t)) tags.dominio.push(k);
  for (const k in ONTOLOGY.objeto) if (ONTOLOGY.objeto[k].test(t)) tags.objeto.push(k);
  for (const k in ONTOLOGY.proceso) if (ONTOLOGY.proceso[k].test(t)) tags.proceso.push(k);

  return tags;
}

// ----------------------------------------------
// 3) Helpers: unicidad + sliding window
// ----------------------------------------------
const unique = arr => [...new Set(arr)];
const limitTags = (arr, max = 3) => arr.slice(-max);

// ----------------------------------------------
// 4) TTL Anti-Drift (caducidad semántica de tags)
// ----------------------------------------------
function cleanExpiredTags(prevTags, prevAges, currentTurn) {
  const TTL = 5; // número de turnos antes de caducar

  const newTags = { dominio: [], objeto: [], proceso: [] };
  const newAges = { dominio: {}, objeto: {}, proceso: {} };

  for (const level of ["dominio", "objeto", "proceso"]) {
    for (const tag of prevTags[level] || []) {
      const age = prevAges[level]?.[tag] ?? currentTurn;
      const expired = currentTurn - age >= TTL;

      if (!expired) {
        newTags[level].push(tag);
        newAges[level][tag] = age;
      }
    }
  }

  return { newTags, newAges };
}

// ----------------------------------------------
// 5) Afinidad ponderada + Persistence Boost R7.3
// ----------------------------------------------
const BASE_WEIGHTS = {
  dominio: 0.45,
  objeto: 0.40,
  proceso: 0.15,
};

function computeAffinity(curr, prev, ages, turn) {
  let score = 0;

  for (const lvl of ["dominio", "objeto", "proceso"]) {
    const c = curr[lvl] || [];
    const p = prev[lvl] || [];
    if (!p.length) continue;

    const inter = c.filter(t => p.includes(t));
    const affinity = inter.length / p.length;

    // ⭐ R7.3 Persistence Boost → usa máxima edad para evitar sesgos
    const boost = inter.length
      ? 1 +
        Math.min(
          Math.max(...inter.map(t => turn - (ages[lvl][t] || turn))) * 0.05,
          0.20
        )
      : 1;

    score += affinity * BASE_WEIGHTS[lvl] * boost;
  }

  return score;
}

// ----------------------------------------------
// 6) Resolver Turno — CORE R7.3
// ----------------------------------------------
export function resolveTurnContext({ userMessage, previousTurnContext }) {
  const text = String(userMessage || "").trim();
  const isHardReset = ONTOLOGY.hard_reset.test(text);

  const current = extractHierTags(text);

  const prev = previousTurnContext?.hierTags || { dominio: [], objeto: [], proceso: [] };

  // Detecta cambio abrupto de dominio
  function detectCrossDomain(prev, curr) {
    if (!prev?.dominio?.length || !curr?.dominio?.length) return false;

    // Si no comparten NI UN dominio → cambio total
    const inter = curr.dominio.filter(d => prev.dominio.includes(d));
    return inter.length === 0;
  }

  const crossDomain = detectCrossDomain(prev, current);

  const prevAges = previousTurnContext?.tagAges || { dominio: {}, objeto: {}, proceso: {} };
  const turnCount = (previousTurnContext?.turnCount || 0) + 1;

  // Limpieza por TTL
  const { newTags: cleanedPrev, newAges: cleanedAges } =
    cleanExpiredTags(prev, prevAges, turnCount);

  // Afinidad dinámica
  const affinity = computeAffinity(current, cleanedPrev, cleanedAges, turnCount);

  // Threshold adaptativo
  const threshold = 0.30 + Math.min(turnCount * 0.015, 0.20);

  let action = "NEW_TOPIC";

  if (isHardReset) action = "HARD_RESET";
  else if (affinity >= threshold) action = "MERGE_CONTEXT";
  else if (
    !current.dominio.length &&
    !current.objeto.length &&
    !current.proceso.length &&
    (cleanedPrev.dominio.length ||
      cleanedPrev.objeto.length ||
      cleanedPrev.proceso.length)
  ) action = "MERGE_CONTEXT";
  else action = "NEW_TOPIC";

  // Fusión final de tags
  const finalTags =
    action === "MERGE_CONTEXT"
      ? {
          dominio: limitTags(unique([...cleanedPrev.dominio, ...current.dominio])),
          objeto: limitTags(unique([...cleanedPrev.objeto, ...current.objeto])),
          proceso: limitTags(unique([...cleanedPrev.proceso, ...current.proceso])),
        }
      : current;

  // Actualizar edades
  const finalAges = { dominio: {}, objeto: {}, proceso: {} };
  for (const lvl of ["dominio", "objeto", "proceso"]) {
    for (const tag of finalTags[lvl]) {
      finalAges[lvl][tag] = cleanedAges[lvl]?.[tag] ?? turnCount;
    }
  }

  return {
    action,
    turnType: action === "MERGE_CONTEXT" ? "follow_up" : "new_topic",
    analysisReset: action !== "MERGE_CONTEXT",
    affinity,
    threshold,
    turnCount,
    hierTags: finalTags,
    tagAges: finalAges,
    tags: [...finalTags.dominio, ...finalTags.objeto, ...finalTags.proceso],
    crossDomain,
  };
}

export default resolveTurnContext;
