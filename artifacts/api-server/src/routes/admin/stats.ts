import { Router } from "express";
import { db } from "@workspace/db";
import { analysisRecordsTable, rhetoricTagsTable, drugsTable, urlQueriesTable } from "@workspace/db";
import { count, avg, sql } from "drizzle-orm";
import { requireAuth } from "../../lib/auth";

const router = Router();

router.get("/admin/stats", requireAuth, async (req, res) => {
  try {
    const [
      totalRecords,
      todayRecords,
      byRisk,
      byInputType,
      avgScore,
      recentActivity,
      totalTags,
      pendingTags,
      totalDrugs,
      totalUrlQueries,
      dailyTrend,
      byTacticRaw,
    ] = await Promise.all([
      db.select({ count: count() }).from(analysisRecordsTable),
      db.select({ count: count() }).from(analysisRecordsTable)
        .where(sql`created_at >= CURRENT_DATE`),
      db.select({ riskLevel: analysisRecordsTable.riskLevel, count: count() })
        .from(analysisRecordsTable).groupBy(analysisRecordsTable.riskLevel),
      db.select({ inputType: analysisRecordsTable.inputType, count: count() })
        .from(analysisRecordsTable).groupBy(analysisRecordsTable.inputType),
      db.select({ avg: avg(analysisRecordsTable.trustScore) }).from(analysisRecordsTable),
      db.select().from(analysisRecordsTable)
        .orderBy(sql`created_at desc`).limit(5),
      db.select({ count: count() }).from(rhetoricTagsTable),
      db.select({ count: count() }).from(rhetoricTagsTable)
        .where(sql`status = 'pending'`),
      db.select({ count: count() }).from(drugsTable),
      db.select({ count: count() }).from(urlQueriesTable),
      db.execute(sql`
        SELECT DATE(created_at) AS date,
               ROUND(AVG(trust_score)::numeric, 1) AS avg_trust,
               COUNT(*)::int AS count
        FROM analysis_records
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      // tactic type counts from array fields
      db.execute(sql`
        SELECT unnest(tactic_types) AS tactic_type, COUNT(*)::int AS count
        FROM analysis_records
        WHERE tactic_types IS NOT NULL
        GROUP BY tactic_type
        ORDER BY count DESC
      `),
    ]);

    const byRiskLevel = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const r of byRisk) byRiskLevel[r.riskLevel as keyof typeof byRiskLevel] = r.count;

    const byInputTypeObj = { text: 0, image: 0 };
    for (const r of byInputType) byInputTypeObj[r.inputType as keyof typeof byInputTypeObj] = r.count;

    const dailyTrustTrend = (dailyTrend.rows as Array<{ date: string; avg_trust: number; count: number }>).map((r) => ({
      date: String(r.date).slice(0, 10),
      avgTrust: Number(r.avg_trust),
      count: Number(r.count),
    }));

    const byTacticType: Record<string, number> = {};
    let totalDetectedTactics = 0;
    for (const r of byTacticRaw.rows as Array<{ tactic_type: string; count: number }>) {
      byTacticType[r.tactic_type] = Number(r.count);
      totalDetectedTactics += Number(r.count);
    }

    res.json({
      totalRecords: totalRecords[0]?.count ?? 0,
      todayRecords: todayRecords[0]?.count ?? 0,
      byRiskLevel,
      byInputType: byInputTypeObj,
      avgTrustScore: Number(avgScore[0]?.avg ?? 0),
      recentActivity: recentActivity.map((r) => ({
        id: r.id,
        inputType: r.inputType,
        inputSummary: r.inputSummary,
        trustScore: r.trustScore,
        riskLevel: r.riskLevel,
        createdAt: r.createdAt.toISOString(),
      })),
      totalTags: totalTags[0]?.count ?? 0,
      pendingTags: pendingTags[0]?.count ?? 0,
      totalDrugs: totalDrugs[0]?.count ?? 0,
      totalUrlQueries: totalUrlQueries[0]?.count ?? 0,
      byRegion: {},
      dailyTrustTrend,
      totalDetectedTactics,
      byTacticType,
    });
  } catch (err) {
    req.log.error(err, "admin stats error");
    res.status(500).json({ error: "統計載入失敗" });
  }
});

export default router;
