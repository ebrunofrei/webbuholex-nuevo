// ======================================================================
// 🧠 TurnContext — Public API (R7.6)
// ======================================================================

export { ONTOLOGY } from "./Ontology.js";
export {
  extractHierarchicalTags,
  extractFlatTags,
  extractTagsWithDensity,
} from "./TagExtractor.js";
export {
  cleanExpiredTags,
  updateTagAges,
  computeInertiaBoost,
} from "./TagTTL.js";
export { computeAffinity } from "./AffinityEngine.js";
export { resolveTurnContext } from "./Resolver.js";
