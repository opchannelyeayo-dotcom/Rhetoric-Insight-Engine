import { Router } from "express";
import { db } from "@workspace/db";
import { urlQueriesTable } from "@workspace/db";
import { forwardToAdmin } from "../lib/adminForward";

const router = Router();

function analyzeUrl(url: URL): {
  status: "safe" | "suspicious" | "high_risk" | "unknown";
  reason: string;
} {
  const lower = url.href.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const highRiskPatterns = [
    /phishing/i,
    /malware/i,
    /hack/i,
    /scam/i,
    /bit\.ly.*health/i,
    /free.*gift.*health/i,
    /miracle.*cure/i,
    /(?:^|\.)[^/]*\.xyz(?:[/:]|$)/i,
  ];
  const suspiciousPatterns = [
    /health.*deal/i,
    /buy.*cheap.*med/i,
    /supplement.*offer/i,
    /weight.*loss.*fast/i,
    /crypto.*health/i,
    /\d{4,}.*pill/i,
    /discount.*drug/i,
  ];
  const trustedDomains = [
    "fda.gov",
    "fda.gov.tw",
    "mohw.gov.tw",
    "nih.gov",
    "who.int",
    "cdc.gov",
    "nhi.gov.tw",
  ];

  for (const domain of trustedDomains) {
    if (hostname === domain || hostname.endsWith(`.${domain}`))
      return {
        status: "safe",
        reason: "此網址屬於政府或公信機構官方網域，安全性較高。",
      };
  }
  for (const p of highRiskPatterns) {
    if (p.test(lower))
      return {
        status: "high_risk",
        reason:
          "網址特徵符合高風險模式（疑似釣魚/詐騙/惡意廣告），建議勿點擊。",
      };
  }
  for (const p of suspiciousPatterns) {
    if (p.test(lower))
      return {
        status: "suspicious",
        reason:
          "網址包含可疑關鍵字，可能為未經核准的健康產品廣告頁面，請謹慎辨別。",
      };
  }

  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("test")
  ) {
    return {
      status: "unknown",
      reason: "無法判定：此網址為本機或測試環境位址，系統無法評估安全性。",
    };
  }

  return {
    status: "unknown",
    reason:
      "目前無法自動判定此網址的風險等級，建議透過瀏覽器安全工具進一步確認。",
  };
}

router.post("/url-query", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string" || url.trim().length === 0) {
    res.status(400).json({ error: "請提供網址" });
    return;
  }

  let parsedUrl: URL;
  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    parsedUrl = new URL(candidate);
    if (!["http:", "https:"].includes(parsedUrl.protocol))
      throw new Error("unsupported protocol");
  } catch {
    res.status(400).json({ error: "請提供有效的 HTTP 或 HTTPS 網址" });
    return;
  }

  const normalized = parsedUrl.href;
  const { status, reason } = analyzeUrl(parsedUrl);
  const isTest =
    normalized.toLowerCase().includes("test") ||
    normalized.includes("localhost");

  try {
    const [record] = await db
      .insert(urlQueriesTable)
      .values({ url: normalized, status, reason, isTest })
      .returning();

    // Forward to admin backend (fire-and-forget, non-fatal)
    forwardToAdmin(
      "/api/integrations/url-query",
      {
        id: record.id,
        url: normalized,
        status,
        reason,
        isTest,
        createdAt: record.createdAt.toISOString(),
      },
      req.log,
    );
  } catch (err) {
    // Logging must not make the public lookup unavailable.
    req.log.error(err, "failed to save url-query record");
  }

  res.json({ url: normalized, status, reason });
});

export default router;
