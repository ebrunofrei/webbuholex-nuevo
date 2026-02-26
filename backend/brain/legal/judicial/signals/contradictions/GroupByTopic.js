// brain/legal/judicial/signals/contradictions/GroupByTopic.js
export function groupClaimsByTopic(claims) {
  const map = new Map();
  for (const c of claims) {
    const key = c.topicKey || `${c.subject}__${c.predicate}__${c.object || "x"}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return Array.from(map.entries()).map(([topicKey, items]) => ({ topicKey, items }));
}