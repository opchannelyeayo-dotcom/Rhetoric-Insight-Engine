import { Router } from "express";
import { db } from "@workspace/db";
import { analysisRecordsTable } from "@workspace/db";
import { desc, eq, count, avg } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/history", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;

  try {
    const [records, totalResult] = await Promise.all([
      db.select().from(analysisRecordsTable).orderBy(desc(analysisRecordsTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(analysisRecordsTable),
    ]);

    res.json({
      records: records.map((r) => ({
        id: r.id,
        inputType: r.inputType,
        inputSummary: r.inputSummary,
        trustScore: r.trustScore,
        riskLevel: r.riskLevel,
        analysisResult: r.analysisResult,
        createdAt: r.createdAt.toISOString(),
      })),
      total: totalResult[0]?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err, "history list error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.get("/history/stats", async (req, res) => {
  try {
    const [total, avgScore, byRisk, recentCount] = await Promise.all([
      db.select({ count: count() }).from(analysisRecordsTable),
      db.select({ avg: avg(analysisRecordsTable.trustScore) }).from(analysisRecordsTable),
      db.select({ riskLevel: analysisRecordsTable.riskLevel, count: count() })
        .from(analysisRecordsTable)
        .groupBy(analysisRecordsTable.riskLevel),
      db.select({ count: count() }).from(analysisRecordsTable)
        .where(sql`created_at > now() - interval '7 days'`),
    ]);

    const byRiskLevel = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of byRisk) {
      byRiskLevel[row.riskLevel as keyof typeof byRiskLevel] = row.count;
    }

    res.json({
      total: total[0]?.count ?? 0,
      byRiskLevel,
      avgTrustScore: Number(avgScore[0]?.avg ?? 0),
      recentCount: recentCount[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err, "history stats error");
    res.status(500).json({ error: "統計載入失敗" });
  }
});

router.get("/history/:id", async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效的 ID" }); return; }

  try {
    const [record] = await db.select().from(analysisRecordsTable).where(eq(analysisRecordsTable.id, id)).limit(1);
    if (!record) { res.status(404).json({ error: "找不到紀錄" }); return; }

    res.json({
      id: record.id,
      inputType: record.inputType,
      inputSummary: record.inputSummary,
      trustScore: record.trustScore,
      riskLevel: record.riskLevel,
      analysisResult: record.analysisResult,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "history get error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.delete("/history/:id", async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效的 ID" }); return; }

  try {
    const deleted = await db.delete(analysisRecordsTable).where(eq(analysisRecordsTable.id, id)).returning();
    if (deleted.length === 0) { res.status(404).json({ error: "找不到紀錄" }); return; }
    res.json({ success: true, message: "已刪除" });
  } catch (err) {
    req.log.error(err, "history delete error");
    res.status(500).json({ error: "刪除失敗" });
  }
});

export default router;
