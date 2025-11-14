// backend/utils/vectorMath.js

export function cosineSimilarity(vecA = [], vecB = []) {
  if (!vecA.length || !vecB.length) return 0;

  let dot = 0;
  let a = 0;
  let b = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    a += vecA[i] * vecA[i];
    b += vecB[i] * vecB[i];
  }

  return dot / (Math.sqrt(a) * Math.sqrt(b));
}
