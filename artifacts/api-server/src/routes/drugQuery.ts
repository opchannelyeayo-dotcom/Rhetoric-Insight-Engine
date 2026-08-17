import { Router } from "express";
import { db } from "@workspace/db";
import { drugsTable } from "@workspace/db";
import { ilike, or, and, eq } from "drizzle-orm";

const router = Router();

router.get("/drug-query", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const category = String(req.query.category ?? "").trim();

  if (!q) {
    res.status(400).json({ error: "請輸入查詢關鍵字" });
    return;
  }

  try {
    const conditions = [
      or(
        ilike(drugsTable.name, `%${q}%`),
        ilike(drugsTable.approvalNumber, `%${q}%`),
        ilike(drugsTable.manufacturer, `%${q}%`),
      )!,
    ];
    if (category) conditions.push(eq(drugsTable.category, category));

    const items = await db
      .select()
      .from(drugsTable)
      .where(and(...conditions))
      .limit(50);

    res.json({
      query: q,
      total: items.length,
      items: items.map((d) => ({
        id: d.id,
        name: d.name,
        approvalNumber: d.approvalNumber,
        manufacturer: d.manufacturer,
        category: d.category,
        approvedDate: d.approvedDate ?? null,
        ingredients: d.ingredients ?? null,
        claims: d.claims ?? null,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err, "drug-query error");
    res.status(500).json({ error: "查詢失敗，請稍後再試" });
  }
});

export default router;
