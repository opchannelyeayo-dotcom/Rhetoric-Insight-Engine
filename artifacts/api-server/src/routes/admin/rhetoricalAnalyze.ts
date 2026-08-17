import { Router } from "express";
import { runRulesAnalysis, runAiAnalysis } from "../../lib/analysis";
import { requireAuth } from "../../lib/auth";

const router = Router();

const SCENE_CONTEXT: Record<string, string> = {
  sales: "銷售話術場景：重點識別高壓促成、虛假優惠、誤導性對比等手法。",
  customer_service: "客服話術場景：重點識別推卸責任、資訊隱瞞、虛假承諾等手法。",
  medical: "醫療場景：重點識別非法醫療宣稱、誇大療效、恐嚇就醫等手法。",
  livestream: "直播帶貨場景：重點識別衝動消費誘導、虛假倒數、假限量等手法。",
  social_post: "社群貼文/KOL場景：重點識別隱性業配、誇大使用體驗、身分冒充等手法。",
};

const SCENE_LAWS: Record<string, string[]> = {
  sales: ["消費者保護法第22條（廣告真實性）", "公平交易法第21條（虛偽不實廣告）"],
  medical: ["健康食品管理法第14條", "食品安全衛生管理法第28條", "醫療法第84條"],
  default: ["消費者保護法", "公平交易法第21條", "食品安全衛生管理法第28條"],
};

router.post("/admin/rhetoric-analyze", requireAuth, async (req, res) => {
  const { text, scene } = req.body as { text?: string; scene?: string };
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "請提供分析文字" });
    return;
  }
  if (text.length > 6000) {
    res.status(400).json({ error: "文字不得超過 6000 字" });
    return;
  }

  try {
    const aiResult = await runAiAnalysis(text);
    const result = aiResult ?? runRulesAnalysis(text);

    const riskTags = result.tactics.map((t) => t.label);
    const sceneCtx = scene ? SCENE_CONTEXT[scene] ?? "" : "";
    const sceneLabel: Record<string, string> = {
      sales: "銷售", customer_service: "客服", medical: "醫療",
      livestream: "直播帶貨", social_post: "社群貼文/KOL",
    };

    const judgment = [
      sceneCtx,
      result.riskReason,
      result.tactics.length > 0
        ? `偵測到的主要風險話術：${result.tactics.map((t) => `${t.label}（${t.severity === "high" ? "高" : t.severity === "medium" ? "中" : "低"}風險）`).join("、")}`
        : "未偵測到明顯操縱性話術。",
    ].filter(Boolean).join("\n\n");

    const rewriteSuggestion = result.tactics.length > 0
      ? `建議改寫方向：\n${result.tactics.map((t) => `• 移除${t.label}相關語句（如：${t.examples.slice(0, 2).join("、")}），改以客觀、有依據的描述替代。`).join("\n")}\n\n改寫後請確認符合衛福部相關法規，避免涉及醫療效能宣稱。`
      : "目前文字風險較低，建議保持現有寫法，並加入核准字號以提高可信度。";

    const laws = SCENE_LAWS[scene ?? ""] ?? SCENE_LAWS["default"];
    const cases = result.tactics.length > 0
      ? [`2023年衛福部裁罰案例：廣告使用「根治」字眼遭罰18萬元`, `2022年公平會裁處：誇大醫師推薦比例不實廣告罰款案`]
      : [];

    res.json({ riskTags, judgment, rewriteSuggestion, laws, cases });
  } catch (err) {
    req.log.error(err, "admin rhetoric-analyze error");
    res.status(500).json({ error: "分析失敗" });
  }
});

export default router;
