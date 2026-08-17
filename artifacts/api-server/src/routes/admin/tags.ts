import { Router } from "express";
import { db } from "@workspace/db";
import { rhetoricTagsTable } from "@workspace/db";
import { desc, eq, and, ilike, count, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../../lib/auth";

const router = Router();

router.get("/admin/tags", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const { q, tacticType, status, region, group } = req.query as Record<string, string>;

  try {
    const conds = [];
    if (q) conds.push(ilike(rhetoricTagsTable.label, `%${q}%`));
    if (tacticType) conds.push(eq(rhetoricTagsTable.tacticType, tacticType));
    if (status) conds.push(eq(rhetoricTagsTable.status, status as "draft" | "pending" | "approved" | "needs_revision"));
    if (region) conds.push(eq(rhetoricTagsTable.region, region));
    if (group) conds.push(eq(rhetoricTagsTable.groupName, group));

    const where = conds.length ? and(...conds) : undefined;
    const [items, total] = await Promise.all([
      db.select().from(rhetoricTagsTable).where(where).orderBy(desc(rhetoricTagsTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(rhetoricTagsTable).where(where),
    ]);

    res.json({
      items: items.map((t) => ({
        id: t.id, label: t.label, tacticType: t.tacticType, group: t.groupName,
        status: t.status, region: t.region ?? null, legalBasis: t.legalBasis ?? null,
        historicalCases: t.historicalCases ?? null, suggestedRewrite: t.suggestedRewrite ?? null,
        riskOverride: t.riskOverride ?? null, verificationStatus: t.verificationStatus ?? null,
        needsReview: t.needsReview, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
      })),
      total: total[0]?.count ?? 0, page, limit,
    });
  } catch (err) {
    req.log.error(err, "admin tags list error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.post("/admin/tags", requireRole("super_admin", "content_reviewer"), async (req, res) => {
  const { label, tacticType, group, status, region, legalBasis, historicalCases, suggestedRewrite, riskOverride, verificationStatus, needsReview } = req.body as Record<string, string | boolean>;
  if (!label || !tacticType || !group || !status) { res.status(400).json({ error: "標籤、話術類型、分組、狀態為必填" }); return; }
  try {
    const [tag] = await db.insert(rhetoricTagsTable).values({
      label: String(label), tacticType: String(tacticType), groupName: String(group),
      status: String(status) as "draft" | "pending" | "approved" | "needs_revision",
      region: region ? String(region) : null, legalBasis: legalBasis ? String(legalBasis) : null,
      historicalCases: historicalCases ? String(historicalCases) : null,
      suggestedRewrite: suggestedRewrite ? String(suggestedRewrite) : null,
      riskOverride: riskOverride ? String(riskOverride) : null,
      verificationStatus: verificationStatus ? String(verificationStatus) : null,
      needsReview: Boolean(needsReview),
    }).returning();
    res.status(201).json({ ...tag, group: tag.groupName, createdAt: tag.createdAt.toISOString(), updatedAt: tag.updatedAt.toISOString() });
  } catch (err) {
    req.log.error(err, "admin tag create error");
    res.status(500).json({ error: "新增失敗" });
  }
});

router.get("/admin/tags/export", requireAuth, async (req, res) => {
  try {
    const tags = await db.select().from(rhetoricTagsTable).orderBy(desc(rhetoricTagsTable.createdAt)).limit(10000);
    const header = "ID,標籤,話術類型,分組,狀態,地區,法源,建立時間\n";
    const rows = tags.map((t) =>
      `${t.id},"${t.label.replace(/"/g, '""')}","${t.tacticType}","${t.groupName}","${t.status}","${t.region ?? ""}","${(t.legalBasis ?? "").replace(/"/g, '""')}",${t.createdAt.toISOString()}`
    ).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="rhetoric-tags-${Date.now()}.csv"`);
    res.send("\uFEFF" + header + rows);
  } catch (err) {
    req.log.error(err, "export tags error");
    res.status(500).json({ error: "匯出失敗" });
  }
});

router.get("/admin/tags/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }
  try {
    const [tag] = await db.select().from(rhetoricTagsTable).where(eq(rhetoricTagsTable.id, id)).limit(1);
    if (!tag) { res.status(404).json({ error: "找不到" }); return; }
    res.json({ ...tag, group: tag.groupName, createdAt: tag.createdAt.toISOString(), updatedAt: tag.updatedAt.toISOString() });
  } catch (err) {
    req.log.error(err, "admin tag get error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.put("/admin/tags/:id", requireRole("super_admin", "content_reviewer"), async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }
  const { label, tacticType, group, status, region, legalBasis, historicalCases, suggestedRewrite, riskOverride, verificationStatus, needsReview } = req.body as Record<string, string | boolean>;
  try {
    const [updated] = await db.update(rhetoricTagsTable).set({
      label: String(label), tacticType: String(tacticType), groupName: String(group),
      status: String(status) as "draft" | "pending" | "approved" | "needs_revision",
      region: region ? String(region) : null, legalBasis: legalBasis ? String(legalBasis) : null,
      historicalCases: historicalCases ? String(historicalCases) : null,
      suggestedRewrite: suggestedRewrite ? String(suggestedRewrite) : null,
      riskOverride: riskOverride ? String(riskOverride) : null,
      verificationStatus: verificationStatus ? String(verificationStatus) : null,
      needsReview: Boolean(needsReview), updatedAt: new Date(),
    }).where(eq(rhetoricTagsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "找不到" }); return; }
    res.json({ ...updated, group: updated.groupName, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error(err, "admin tag update error");
    res.status(500).json({ error: "更新失敗" });
  }
});

router.delete("/admin/tags/:id", requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }
  try {
    const deleted = await db.delete(rhetoricTagsTable).where(eq(rhetoricTagsTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ error: "找不到" }); return; }
    res.json({ success: true, message: "已刪除" });
  } catch (err) {
    req.log.error(err, "admin tag delete error");
    res.status(500).json({ error: "刪除失敗" });
  }
});

export default router;
