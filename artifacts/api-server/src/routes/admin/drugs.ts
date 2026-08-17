import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { db } from "@workspace/db";
import { drugsTable } from "@workspace/db";
import { desc, eq, and, or, ilike, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../../lib/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/admin/drugs", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const q = String(req.query.q ?? "").trim();
  const category = String(req.query.category ?? "").trim();

  try {
    const conds = [];
    if (q) conds.push(or(ilike(drugsTable.name, `%${q}%`), ilike(drugsTable.approvalNumber, `%${q}%`), ilike(drugsTable.manufacturer, `%${q}%`))!);
    if (category) conds.push(eq(drugsTable.category, category));

    const where = conds.length ? and(...conds) : undefined;
    const [items, total] = await Promise.all([
      db.select().from(drugsTable).where(where).orderBy(desc(drugsTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(drugsTable).where(where),
    ]);

    res.json({ items: items.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })), total: total[0]?.count ?? 0, page, limit });
  } catch (err) {
    req.log.error(err, "admin drugs list error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.post("/admin/drugs", requireRole("super_admin", "content_reviewer"), async (req, res) => {
  const { name, approvalNumber, manufacturer, category, approvedDate, ingredients, claims, status } = req.body as Record<string, string>;
  if (!name || !approvalNumber || !manufacturer || !category) {
    res.status(400).json({ error: "名稱、核准字號、廠商、類別為必填" });
    return;
  }
  try {
    const [drug] = await db.insert(drugsTable).values({ name, approvalNumber, manufacturer, category, approvedDate: approvedDate || null, ingredients: ingredients || null, claims: claims || null, status: status || "active" }).returning();
    res.status(201).json({ ...drug, createdAt: drug.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err, "admin drug create error");
    res.status(500).json({ error: "新增失敗" });
  }
});

router.post("/admin/drugs/import", requireRole("super_admin", "content_reviewer"), upload.single("file"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "請上傳 CSV 檔案" }); return; }
  try {
    const text = req.file.buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const r of records) {
      const name = r["name"] || r["名稱"] || r["藥品名稱"] || "";
      const approvalNumber = r["approvalNumber"] || r["核准字號"] || "";
      const manufacturer = r["manufacturer"] || r["廠商"] || "";
      const category = r["category"] || r["類別"] || "保健品";
      if (!name || !approvalNumber || !manufacturer) { skipped++; errors.push(`行 ${imported + skipped}: 缺少必要欄位`); continue; }
      try {
        await db.insert(drugsTable).values({ name, approvalNumber, manufacturer, category, approvedDate: r["approvedDate"] || r["核准日期"] || null, ingredients: r["ingredients"] || r["成分"] || null, claims: r["claims"] || r["核准適應症"] || null, status: "active" });
        imported++;
      } catch { skipped++; errors.push(`行 ${imported + skipped}: 資料重複或格式錯誤`); }
    }
    res.json({ success: true, imported, skipped, errors });
  } catch (err) {
    req.log.error(err, "admin drug import error");
    res.status(500).json({ error: "匯入失敗" });
  }
});

router.put("/admin/drugs/:id", requireRole("super_admin", "content_reviewer"), async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }
  const { name, approvalNumber, manufacturer, category, approvedDate, ingredients, claims, status } = req.body as Record<string, string>;
  try {
    const [updated] = await db.update(drugsTable).set({ name, approvalNumber, manufacturer, category, approvedDate: approvedDate || null, ingredients: ingredients || null, claims: claims || null, status: status || "active" }).where(eq(drugsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "找不到" }); return; }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err, "admin drug update error");
    res.status(500).json({ error: "更新失敗" });
  }
});

router.delete("/admin/drugs/:id", requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }
  try {
    const deleted = await db.delete(drugsTable).where(eq(drugsTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ error: "找不到" }); return; }
    res.json({ success: true, message: "已刪除" });
  } catch (err) {
    req.log.error(err, "admin drug delete error");
    res.status(500).json({ error: "刪除失敗" });
  }
});

export default router;
