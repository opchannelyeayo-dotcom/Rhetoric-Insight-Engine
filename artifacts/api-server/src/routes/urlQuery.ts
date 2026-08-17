import { Router } from "express";
import { db } from "@workspace/db";
import { urlQueriesTable } from "@workspace/db";

const router = Router();

function analyzeUrl(url: string): { status: "safe" | "suspicious" | "high_risk" | "unknown"; reason: string } {
  const lower = url.toLowerCase();
  const highRiskPatterns = [
    /phishing/i, /malware/i, /hack/i, /scam/i,
    /bit\.ly.*health/i, /free.*gift.*health/i,
    /miracle.*cure/i, /\.xyz$/i,
  ];
  const suspiciousPatterns = [
    /health.*deal/i, /buy.*cheap.*med/i, /supplement.*offer/i,
    /weight.*loss.*fast/i, /crypto.*health/i,
    /\d{4,}.*pill/i, /discount.*drug/i,
  ];
  const safePatterns = [
    /fda\.gov/, /mohw\.gov\.tw/, /tfda\.fda\.gov\.tw/,
    /nih\.gov/, /who\.int/, /cdc\.gov/, /nhi\.gov\.tw/,
    /gov\.tw/, /edu\.tw/,
  ];

  for (const p of safePatterns) {
    if (p.test(lower)) return { status: "safe", reason: "此網址屬於政府或公信機構官方網域，安全性較高。" };
  }
  for (const p of highRiskPatterns) {
    if (p.test(lower)) return { status: "high_risk", reason: "網址特徵符合高風險模式（疑似釣魚/詐騙/惡意廣告），建議勿點擊。" };
  }
  for (const p of suspiciousPatterns) {
    if (p.test(lower)) return { status: "suspicious", reason: "網址包含可疑關鍵字，可能為未經核准的健康產品廣告頁面，請謹慎辨別。" };
  }

  // Check for test URLs
  if (lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("test")) {
    return { status: "unknown", reason: "無法判定：此網址為本機或測試環境位址，系統無法評估安全性。" };
  }

  return { status: "unknown", reason: "目前無法自動判定此網址的風險等級，建議透過瀏覽器安全工具進一步確認。" };
}

router.post("/url-query", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string" || url.trim().length === 0) {
    res.status(400).json({ error: "請提供網址" });
    return;
  }

  const normalized = url.trim();
  const { status, reason } = analyzeUrl(normalized);
  const isTest = normalized.toLowerCase().includes("test") || normalized.includes("localhost");

  try {
    await db.insert(urlQueriesTable).values({ url: normalized, status, reason, isTest });
    res.json({ url: normalized, status, reason });
  } catch (err) {
    req.log.error(err, "url-query error");
    res.status(500).json({ error: "查詢失敗，請稍後再試" });
  }
});

export default router;
