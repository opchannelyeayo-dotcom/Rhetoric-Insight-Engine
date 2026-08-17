import { pgTable, serial, text, integer, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high", "critical"]);
export const inputTypeEnum = pgEnum("input_type", ["text", "image"]);

export const analysisRecordsTable = pgTable("analysis_records", {
  id: serial("id").primaryKey(),
  inputType: inputTypeEnum("input_type").notNull().default("text"),
  inputText: text("input_text"),
  inputSummary: text("input_summary").notNull(),
  trustScore: integer("trust_score").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  analysisResult: jsonb("analysis_result"),
  tacticTypes: text("tactic_types").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AnalysisRecord = typeof analysisRecordsTable.$inferSelect;
export type InsertAnalysisRecord = typeof analysisRecordsTable.$inferInsert;
