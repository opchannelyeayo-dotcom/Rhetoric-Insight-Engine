// Rules-based rhetoric analysis engine (fallback when AI key is not set)

export type TacticSeverity = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Tactic {
  type: string;
  label: string;
  description: string;
  examples: string[];
  severity: TacticSeverity;
}

export interface Segment {
  text: string;
  start: number;
  end: number;
  tacticType: string | null;
  tacticLabel: string | null;
  isSuspicious: boolean;
}

export interface AnalysisOutput {
  trustScore: number;
  riskLevel: RiskLevel;
  riskReason: string;
  tactics: Tactic[];
  segments: Segment[];
  factCheck: string;
  healthTips: string;
  analysisMode: "ai" | "rules";
  aiAvailable: boolean;
}

// 六大操縱性話術定義
const TACTIC_PATTERNS: Array<{
  type: string;
  label: string;
  description: string;
  severity: TacticSeverity;
  patterns: RegExp[];
  examples: string[];
}> = [
  {
    type: "false_urgency",
    label: "虛假緊迫感",
    description: "製造人工限時或限量壓力，迫使消費者衝動決策，繞過理性判斷。",
    severity: "high",
    patterns: [
      /限時[優惠促銷折扣特價]/,
      /最後[一兩三\d]+[名份個瓶盒]/,
      /售完為止/,
      /今[天日]限定/,
      /倒數/,
      /即將[漲價截止結束]/,
      /不搶就沒了/,
      /現在下單/,
      /立即購買.*優惠/,
      /活動[即將快要]結束/,
    ],
    examples: ["限時優惠！", "最後3瓶！", "今天限定特價", "售完為止"],
  },
  {
    type: "exaggerated_claims",
    label: "誇大療效",
    description: "宣稱超出科學依據的療效或功效，使用絕對性語言描述健康效果。",
    severity: "high",
    patterns: [
      /治[好癒療]|根治|痊癒/,
      /100%有效|保證有效/,
      /神奇|奇效|奇蹟/,
      /[快速迅速].*[減肥瘦身降血壓降血糖]/,
      /[一週個月].*[瘦了公斤]/,
      /完全[治療根除消除]/,
      /醫師推薦.*療效/,
      /專利配方.*[治療療效]/,
      /徹底[解決改善消除].*(病|症|痛)/,
    ],
    examples: ["根治糖尿病", "100%有效減肥", "一週瘦10公斤", "神奇療效"],
  },
  {
    type: "emotional_manipulation",
    label: "情緒操控",
    description: "利用罪惡感、恐懼或情感勒索影響消費決策，尤其針對家人健康議題。",
    severity: "medium",
    patterns: [
      /孝順|孝敬|孝心/,
      /[爸媽父母家人爺奶].*[健康身體]/,
      /[不買不送].*[後悔遺憾]/,
      /愛.*就要/,
      /最好的[禮物選擇]/,
      /不要讓.*[後悔擔心]/,
      /[照顧保護].*[全家老人長輩]/,
    ],
    examples: ["孝順就要買", "愛家人就要保護他們的健康", "不送就後悔"],
  },
  {
    type: "social_proof",
    label: "社會認同",
    description: "利用名人背書、用戶見證或數量聲稱製造從眾壓力，但缺乏可驗證依據。",
    severity: "medium",
    patterns: [
      /[數萬千百]人[已在].*[使用見證推薦]/,
      /醫師.*推薦|專家.*推薦/,
      /電視.*介紹|報紙.*報導/,
      /明星.*代言|藝人.*推薦/,
      /好評如潮|一致好評/,
      /全球[熱銷暢銷]/,
      /用戶.*見證|真實見證/,
      /[滿意度].*[9]\d%/,
    ],
    examples: [
      "萬人見證有效",
      "醫師強力推薦",
      "全球熱銷",
      "滿意度高達98%",
    ],
  },
  {
    type: "fear_appeal",
    label: "恐懼訴求",
    description: "誇大健康風險或疾病威脅，製造消費者對自身健康的恐懼與焦慮。",
    severity: "high",
    patterns: [
      /不[用吃喝].*後果[不堪嚴重]/,
      /[忽視置之不理].*[危險致命]/,
      /[癌症腫瘤心臟病中風].*[風險機率]/,
      /身體[已正在].*[毒素廢物]/,
      /[腸道血管].*[堵塞髒污]/,
      /如果不.*[後果代價]/,
      /[慢性病].*[潛伏蔓延]/,
    ],
    examples: [
      "不吃後果不堪設想",
      "體內累積毒素危害健康",
      "忽視可能致命",
    ],
  },
  {
    type: "scarcity_manipulation",
    label: "稀缺性操控",
    description: "人工製造產品稀缺感，聲稱特殊成分難以取得，提高感知價值。",
    severity: "medium",
    patterns: [
      /[珍稀罕見稀有].*[成分原料]/,
      /[秘方獨家專利]配方/,
      /[原料有限].*[供不應求]/,
      /[限量]生產/,
      /[進口].*[珍稀高端]/,
      /市面[難以].*找到|買不到的/,
      /[獨家]代理|全台灣唯一/,
    ],
    examples: [
      "珍稀原料限量生產",
      "獨家秘方",
      "全台灣唯一代理",
      "進口珍稀成分",
    ],
  },
];

function findTactics(text: string): {
  tactics: Tactic[];
  suspiciousRanges: Array<{
    start: number;
    end: number;
    tacticType: string;
    tacticLabel: string;
  }>;
} {
  const detectedTypes = new Set<string>();
  const suspiciousRanges: Array<{
    start: number;
    end: number;
    tacticType: string;
    tacticLabel: string;
  }> = [];

  for (const tactic of TACTIC_PATTERNS) {
    for (const pattern of tactic.patterns) {
      const regex = new RegExp(pattern.source, "g");
      let match;
      while ((match = regex.exec(text)) !== null) {
        detectedTypes.add(tactic.type);
        suspiciousRanges.push({
          start: match.index,
          end: match.index + match[0].length,
          tacticType: tactic.type,
          tacticLabel: tactic.label,
        });
      }
    }
  }

  const tactics: Tactic[] = TACTIC_PATTERNS.filter((t) =>
    detectedTypes.has(t.type)
  ).map((t) => ({
    type: t.type,
    label: t.label,
    description: t.description,
    examples: t.examples,
    severity: t.severity,
  }));

  return { tactics, suspiciousRanges };
}

function buildSegments(
  text: string,
  suspiciousRanges: Array<{
    start: number;
    end: number;
    tacticType: string;
    tacticLabel: string;
  }>
): Segment[] {
  if (suspiciousRanges.length === 0) {
    return [
      {
        text,
        start: 0,
        end: text.length,
        tacticType: null,
        tacticLabel: null,
        isSuspicious: false,
      },
    ];
  }

  // Merge overlapping ranges, keeping the first tactic
  const sorted = [...suspiciousRanges].sort((a, b) => a.start - b.start);
  const merged: typeof sorted = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of merged) {
    if (cursor < r.start) {
      segments.push({
        text: text.slice(cursor, r.start),
        start: cursor,
        end: r.start,
        tacticType: null,
        tacticLabel: null,
        isSuspicious: false,
      });
    }
    segments.push({
      text: text.slice(r.start, r.end),
      start: r.start,
      end: r.end,
      tacticType: r.tacticType,
      tacticLabel: r.tacticLabel,
      isSuspicious: true,
    });
    cursor = r.end;
  }
  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      start: cursor,
      end: text.length,
      tacticType: null,
      tacticLabel: null,
      isSuspicious: false,
    });
  }
  return segments;
}

function calcTrustScore(tactics: Tactic[]): number {
  if (tactics.length === 0) return 85;
  let penalty = 0;
  for (const t of tactics) {
    if (t.severity === "high") penalty += 20;
    else if (t.severity === "medium") penalty += 12;
    else penalty += 6;
  }
  return Math.max(10, Math.min(85, 85 - penalty));
}

function calcRiskLevel(score: number, tactics: Tactic[]): RiskLevel {
  const hasHighSeverity = tactics.some((t) => t.severity === "high");
  if (score <= 30 || (hasHighSeverity && tactics.length >= 3))
    return "critical";
  if (score <= 50 || (hasHighSeverity && tactics.length >= 1)) return "high";
  if (score <= 70 || tactics.length >= 2) return "medium";
  return "low";
}

function buildRiskReason(tactics: Tactic[], riskLevel: RiskLevel): string {
  if (tactics.length === 0) {
    return "文字內容未發現明顯操縱性話術，信任度相對較高。建議仍參考核准資訊做最終判斷。";
  }
  const labels = tactics.map((t) => t.label).join("、");
  const levelText = { low: "低", medium: "中", high: "高", critical: "極高" }[
    riskLevel
  ];
  return `偵測到 ${tactics.length} 種操縱手法（${labels}），整體風險等級${levelText}。廣告文字使用了可能誤導消費者的語言模式，建議查閱核准字號與官方衛福部資料庫後再做決定。`;
}

function buildFactCheck(tactics: Tactic[]): string {
  const parts: string[] = [
    "【事實還原】依據台灣衛生福利部規定，健康食品廣告不得涉及醫療效能。",
  ];
  if (tactics.some((t) => t.type === "exaggerated_claims")) {
    parts.push(
      "廣告中出現的療效宣稱，依《健康食品管理法》及《食品安全衛生管理法》屬於違規內容，業者可能面臨處分。"
    );
  }
  if (tactics.some((t) => t.type === "false_urgency")) {
    parts.push(
      "限時限量等促銷話術屬於常見行銷手段，不代表產品實際效果，建議冷靜思考後再購買。"
    );
  }
  if (tactics.some((t) => t.type === "social_proof")) {
    parts.push(
      "醫師推薦或名人代言若無具體引文出處，消費者難以自行驗證，建議要求廠商提供原始佐證資料。"
    );
  }
  if (parts.length === 1) {
    parts.push("目前文字未見明顯違規宣稱，但消費前仍建議查詢核准字號。");
  }
  return parts.join(" ");
}

const HEALTH_TIPS = [
  "購買前先查詢衛福部食品藥物管理署官方資料庫，確認產品核准字號。",
  "任何宣稱可治療疾病的保健品均屬違規，出現此類字眼應提高警覺。",
  "保健食品不等於藥品，無法取代正規醫療，有健康疑慮請先就醫諮詢。",
  "謹慎辨別廣告與實際效果的差距，參考多方資訊來源做出理性判斷。",
  "若懷疑產品廣告違規，可向衛福部食品藥物管理署（0800-285-000）舉報。",
];

export function runRulesAnalysis(text: string): AnalysisOutput {
  const { tactics, suspiciousRanges } = findTactics(text);
  const segments = buildSegments(text, suspiciousRanges);
  const trustScore = calcTrustScore(tactics);
  const riskLevel = calcRiskLevel(trustScore, tactics);
  const riskReason = buildRiskReason(tactics, riskLevel);
  const factCheck = buildFactCheck(tactics);
  const healthTips = HEALTH_TIPS.join("\n");

  return {
    trustScore,
    riskLevel,
    riskReason,
    tactics,
    segments,
    factCheck,
    healthTips,
    analysisMode: "rules",
    aiAvailable: false,
  };
}

// AI analysis via OpenAI (optional – gracefully degrades if key missing)
export async function runAiAnalysis(
  text: string
): Promise<AnalysisOutput | null> {
  const apiKey =
    process.env["OPENAI_API_KEY"] || process.env["AI_API_KEY"] || "";
  if (!apiKey) return null;

  try {
    const prompt = `你是一位台灣健康廣告審查專家，請分析以下廣告文字中的操縱性話術。

請以JSON格式回應，包含以下欄位：
{
  "trustScore": 0-100整數（100=完全可信，0=完全不可信）,
  "riskLevel": "low"|"medium"|"high"|"critical",
  "riskReason": "風險原因說明（繁體中文）",
  "tactics": [{"type":"string","label":"繁體中文標籤","description":"說明","examples":["例子"],"severity":"low"|"medium"|"high"}],
  "factCheck": "事實還原說明（繁體中文）",
  "healthTips": "健康消費提醒（繁體中文）",
  "suspiciousSegments": [{"text":"可疑片段","tacticType":"類型","tacticLabel":"標籤"}]
}

六大話術類型：false_urgency(虛假緊迫感), exaggerated_claims(誇大療效), emotional_manipulation(情緒操控), social_proof(社會認同), fear_appeal(恐懼訴求), scarcity_manipulation(稀缺性操控)

廣告文字：
${text.slice(0, 3000)}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const raw = JSON.parse(data.choices[0]?.message?.content ?? "{}") as {
      trustScore?: number;
      riskLevel?: string;
      riskReason?: string;
      tactics?: Tactic[];
      factCheck?: string;
      healthTips?: string;
      suspiciousSegments?: Array<{
        text: string;
        tacticType: string;
        tacticLabel: string;
      }>;
    };

    // Build segments from AI output
    const suspiciousRanges: Array<{
      start: number;
      end: number;
      tacticType: string;
      tacticLabel: string;
    }> = [];
    for (const seg of raw.suspiciousSegments ?? []) {
      const idx = text.indexOf(seg.text);
      if (idx !== -1) {
        suspiciousRanges.push({
          start: idx,
          end: idx + seg.text.length,
          tacticType: seg.tacticType,
          tacticLabel: seg.tacticLabel,
        });
      }
    }
    const segments = buildSegments(text, suspiciousRanges);

    return {
      trustScore: raw.trustScore ?? 50,
      riskLevel: (raw.riskLevel as RiskLevel) ?? "medium",
      riskReason: raw.riskReason ?? "",
      tactics: raw.tactics ?? [],
      segments,
      factCheck: raw.factCheck ?? "",
      healthTips: raw.healthTips ?? "",
      analysisMode: "ai",
      aiAvailable: true,
    };
  } catch {
    return null;
  }
}
