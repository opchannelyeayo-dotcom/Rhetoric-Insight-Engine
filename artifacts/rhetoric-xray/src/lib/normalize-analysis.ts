import type { AnalysisResult } from "@workspace/api-client-react";

const tacticLabels: Record<string, string> = {
  false_urgency: "虛假緊迫感",
  exaggerated_claims: "誇大療效",
  emotional_manipulation: "情緒操控",
  social_proof: "社會認同",
  fear_appeal: "恐懼訴求",
  scarcity_manipulation: "稀缺性操控",
};

// Repairs the common case where UTF-8 bytes were decoded as Windows-1252.
// Strings that do not clearly look corrupted are deliberately left untouched.
function repairText(value: string): string {
  if (!/[ÃÂæçèéåäïð]/.test(value)) return value;
  const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0)));
  const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return repaired.includes("�") ? value : repaired;
}

function repairDeep(value: unknown): unknown {
  if (typeof value === "string") return repairText(value);
  if (Array.isArray(value)) return value.map(repairDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, repairDeep(child)]));
  }
  return value;
}

export function normalizeAnalysisResult(value: unknown): AnalysisResult | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const result = repairDeep(parsed) as AnalysisResult;
  result.tactics = Array.isArray(result.tactics) ? result.tactics.map((tactic) => ({
    ...tactic,
    label: tacticLabels[tactic.type] ?? tactic.label,
  })) : [];
  result.segments = Array.isArray(result.segments) ? result.segments.map((segment) => ({
    ...segment,
    tacticLabel: segment.tacticType ? tacticLabels[segment.tacticType] ?? segment.tacticLabel : segment.tacticLabel,
  })) : [];
  return result;
}
