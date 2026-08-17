import { Router } from "express";
import multer from "multer";
import path from "path";
import { db } from "@workspace/db";
import { analysisRecordsTable } from "@workspace/db";
import { runRulesAnalysis, runAiAnalysis } from "../lib/analysis";
import { forwardToAdmin } from "../lib/adminForward";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) cb(null, true);
    else cb(new Error("僅支援 JPG、PNG、WEBP 格式"));
  },
});

// POST /api/analyze
router.post("/analyze", async (req, res) => {
  const { text } = req.body as { text?: string };
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

    const summary = text.slice(0, 80).replace(/\s+/g, " ").trim();
    const tacticTypes = result.tactics.map((t) => t.type);

    const [record] = await db
      .insert(analysisRecordsTable)
      .values({
        inputType: "text",
        inputText: text.slice(0, 5000),
        inputSummary: summary,
        trustScore: result.trustScore,
        riskLevel: result.riskLevel,
        analysisResult: result as unknown as Record<string, unknown>,
        tacticTypes,
      })
      .returning();

    const responseBody = {
      ...result,
      id: record.id,
      createdAt: record.createdAt.toISOString(),
    };

    // Forward to admin backend (fire-and-forget, non-fatal)
    forwardToAdmin(
      "/api/integrations/analysis",
      {
        id: record.id,
        inputType: "text",
        inputSummary: summary,
        trustScore: result.trustScore,
        riskLevel: result.riskLevel,
        tacticTypes,
        analysisResult: result,
        createdAt: record.createdAt.toISOString(),
      },
      req.log
    );

    res.json(responseBody);
  } catch (err) {
    req.log.error(err, "analyze error");
    res.status(500).json({ error: "分析失敗，請稍後再試" });
  }
});

// POST /api/upload-image  (multipart handled manually)
router.post("/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "請上傳圖片（JPG/PNG/WEBP，最大 5MB）" });
    return;
  }

  try {
    const apiKey =
      process.env["OPENAI_API_KEY"] || process.env["AI_API_KEY"] || "";
    let extractedText = "";
    let ocrSuccess = false;
    let message: string | null = null;

    if (apiKey) {
      const base64 = req.file.buffer.toString("base64");
      const mime = req.file.mimetype;
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "請將圖片中所有廣告文字完整擷取，只輸出原文，不需要任何解釋。",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${mime};base64,${base64}` },
                },
              ],
            },
          ],
          max_tokens: 2000,
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          choices: Array<{ message: { content: string } }>;
        };
        extractedText = data.choices[0]?.message?.content ?? "";
        ocrSuccess = extractedText.length > 0;
      }
    }

    if (!ocrSuccess) {
      message = apiKey
        ? "OCR 擷取失敗，請手動貼上圖片中的廣告文字後再分析。"
        : "AI OCR 功能需設定 OPENAI_API_KEY，請手動輸入圖片中的廣告文字。";
    }

    res.json({ extractedText, success: ocrSuccess, message });
  } catch (err) {
    req.log.error(err, "upload-image error");
    res.status(500).json({ error: "圖片處理失敗，請稍後再試" });
  }
});

export default router;
