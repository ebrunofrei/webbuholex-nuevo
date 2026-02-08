// backend/routes/ia/bubble/bubbleIntentDetector.js

const CLIENT_MODE_PATTERNS = [
  /in my case/i,
  /what should i do/i,
  /do you recommend/i,
  /is it convenient/i,
  /my lawsuit/i,
  /my case/i,
  /today i have/i,
  /i want to file/i,
  /should i file/i,
];

export function detectUserIntent(prompt = "") {
  const normalized = prompt.toLowerCase();

  for (const pattern of CLIENT_MODE_PATTERNS) {
    if (pattern.test(normalized)) {
      return "real_case_decision";
    }
  }

  return "descriptive_or_academic";
}
