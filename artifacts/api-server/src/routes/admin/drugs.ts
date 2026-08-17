import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { db } from "@workspace/db";
import { drugsTable } from "@workspace/db";
import { desc, eq, and, or, ilike, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../../lib/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.originalname.toLowerCase().endsWith(".csv"));
  },
});

function decodeCsv(buffer: Buffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
  const replacementCount = (utf8.match(/�/g) ?? []).length;
  if (replacementCount === 0) return utf8;
  // Many Taiwan government exports and older Excel files use Big5/CP950.
  return new TextDecoder("big5").decode(buffer).replace(/^\uFEFF/, "");
}

function valueOf(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[alias]?.trim();
    if (value) return value;
  }
  return "";
}

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
    const text = decodeCsv(req.file.buffer);
    const records = parse(text, {
      columns: (headers: string[]) => headers.map((header) => header.replace(/^\uFEFF/, "").trim()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    if (records.length === 0) {
      res.status(400).json({ error: "CSV 沒有可匯入的資料" });
      return;
    }
    const existing = new Set((await db.select({ approvalNumber: drugsTable.approvalNumber }).from(drugsTable))
      .map((row) => row.approvalNumber.trim().toLocaleLowerCase()));
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const r of records) {
      const rowNumber = imported + skipped + 2;
      const name = valueOf(r, ["name", "名稱", "藥品名稱", "產品名稱"]);
      const approvalNumber = valueOf(r, ["approvalNumber", "approval_number", "核准字號", "許可證字號"]);
      const manufacturer = valueOf(r, ["manufacturer", "廠商", "廠商名稱", "製造商"]);
      const category = valueOf(r, ["category", "類別", "分類"]) || "藥品";
      if (!name || !approvalNumber || !manufacturer) { skipped++; errors.push(`第 ${rowNumber} 行：缺少名稱、核准字號或廠商`); continue; }
      const duplicateKey = approvalNumber.toLocaleLowerCase();
      if (existing.has(duplicateKey)) { skipped++; errors.push(`第 ${rowNumber} 行：核准字號重複（${approvalNumber}）`); continue; }
      try {
        await db.insert(drugsTable).values({
          name, approvalNumber, manufacturer, category,
          approvedDate: valueOf(r, ["approvedDate", "approved_date", "核准日期"]) || null,
          ingredients: valueOf(r, ["ingredients", "成分", "主成分"]) || null,
          claims: valueOf(r, ["claims", "核准適應症", "適應症", "保健功效"]) || null,
          status: valueOf(r, ["status", "狀態"]) || "active",
        });
        existing.add(duplicateKey);
        imported++;
      } catch { skipped++; errors.push(`第 ${rowNumber} 行：資料格式錯誤`); }
    }
    res.json({ success: true, imported, skipped, errors });
  } catch (err) {
    req.log.error(err, "admin drug import error");
    res.status(400).json({ error: "CSV 格式不正確，請確認欄位與引號格式" });
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
