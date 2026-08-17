import { Router } from "express";
import { db } from "@workspace/db";
import { urlQueriesTable } from "@workspace/db";
import { desc, eq, and, ilike, count, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../../lib/auth";

const router = Router();

router.get("/admin/url-queries", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const { status, q } = req.query as Record<string, string>;

  try {
    const conds = [];
    if (status) conds.push(eq(urlQueriesTable.status, status as "safe" | "suspicious" | "high_risk" | "unknown"));
    if (q) conds.push(ilike(urlQueriesTable.url, `%${q}%`));

    const where = conds.length ? and(...conds) : undefined;
    const [items, total] = await Promise.all([
      db.select().from(urlQueriesTable).where(where).orderBy(desc(urlQueriesTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(urlQueriesTable).where(where),
    ]);

    res.json({
      items: items.map((u) => ({
        id: u.id, url: u.url, status: u.status, reason: u.reason,
        isTest: u.isTest, createdAt: u.createdAt.toISOString(),
      })),
      total: total[0]?.count ?? 0, page, limit,
    });
  } catch (err) {
    req.log.error(err, "admin url-queries list error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.delete("/admin/url-queries/clear-test", requireRole("super_admin"), async (req, res) => {
  try {
    await db.delete(urlQueriesTable).where(eq(urlQueriesTable.isTest, true));
    res.json({ success: true, message: "已清除測試資料" });
  } catch (err) {
    req.log.error(err, "admin url-queries clear-test error");
    res.status(500).json({ error: "清除失敗" });
  }
});

export default router;
