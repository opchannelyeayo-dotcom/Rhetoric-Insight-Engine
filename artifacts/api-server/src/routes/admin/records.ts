import { Router } from "express";
import { db } from "@workspace/db";
import { analysisRecordsTable } from "@workspace/db";
import { desc, asc, eq, and, sql, count } from "drizzle-orm";
import { requireAuth } from "../../lib/auth";

const router = Router();

router.get("/admin/records", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const { riskLevel, inputType, tacticType, sort } = req.query as Record<string, string>;

  try {
    const conditions: ReturnType<typeof eq>[] = [];
    if (riskLevel) conditions.push(eq(analysisRecordsTable.riskLevel, riskLevel as "low" | "medium" | "high" | "critical"));
    if (inputType) conditions.push(eq(analysisRecordsTable.inputType, inputType as "text" | "image"));
    if (tacticType) conditions.push(sql`${tacticType} = ANY(tactic_types)` as unknown as ReturnType<typeof eq>);

    const orderBy = (() => {
      switch (sort) {
        case "oldest": return [asc(analysisRecordsTable.createdAt)];
        case "trustAsc": return [asc(analysisRecordsTable.trustScore)];
        case "trustDesc": return [desc(analysisRecordsTable.trustScore)];
        default: return [desc(analysisRecordsTable.createdAt)];
      }
    })();

    const [records, totalResult] = await Promise.all([
      db.select().from(analysisRecordsTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(analysisRecordsTable)
        .where(conditions.length ? and(...conditions) : undefined),
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
    req.log.error(err, "admin records list error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.get("/admin/records/export", requireAuth, async (req, res) => {
  try {
    const records = await db.select().from(analysisRecordsTable)
      .orderBy(desc(analysisRecordsTable.createdAt))
      .limit(10000);

    const header = "ID,輸入方式,摘要,信任度,風險等級,建立時間\n";
    const rows = records.map((r) =>
      `${r.id},"${r.inputType === "text" ? "文字" : "圖片"}","${r.inputSummary.replace(/"/g, '""')}",${r.trustScore},${r.riskLevel},${r.createdAt.toISOString()}`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="analysis-records-${Date.now()}.csv"`);
    res.send("\uFEFF" + header + rows);
  } catch (err) {
    req.log.error(err, "export records error");
    res.status(500).json({ error: "匯出失敗" });
  }
});

router.get("/admin/records/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }
  try {
    const [record] = await db.select().from(analysisRecordsTable).where(eq(analysisRecordsTable.id, id)).limit(1);
    if (!record) { res.status(404).json({ error: "找不到紀錄" }); return; }
    res.json({ ...record, createdAt: record.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err, "admin record get error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.delete("/admin/records/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }
  try {
    const deleted = await db.delete(analysisRecordsTable).where(eq(analysisRecordsTable.id, id)).returning();
    if (deleted.length === 0) { res.status(404).json({ error: "找不到紀錄" }); return; }
    res.json({ success: true, message: "已刪除" });
  } catch (err) {
    req.log.error(err, "admin record delete error");
    res.status(500).json({ error: "刪除失敗" });
  }
});

export default router;
