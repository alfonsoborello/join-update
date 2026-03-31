const adjectives = [
  "Silver", "Golden", "Silent", "Echo", "Vibrant", "Muted", "Geometric", "Minimal",
  "Strict", "Pure", "Hidden", "Ghost", "Poetic", "Unique", "Active", "Curated"
];

const nouns = [
  "Echo", "Matrix", "Update", "Key", "Network", "Feed", "Signature", "Logo",
  "Motto", "Layer", "Broadcast", "Structure", "Arrow", "Vibe", "Ghost", "Poet"
];

export function generatePoeticKey() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
}
