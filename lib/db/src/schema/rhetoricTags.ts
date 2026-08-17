import { pgTable, serial, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const tagStatusEnum = pgEnum("tag_status", ["draft", "pending", "approved", "needs_revision"]);

export const rhetoricTagsTable = pgTable("rhetoric_tags", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  tacticType: text("tactic_type").notNull(),
  groupName: text("group_name").notNull(),
  status: tagStatusEnum("status").notNull().default("draft"),
  region: text("region"),
  legalBasis: text("legal_basis"),
  historicalCases: text("historical_cases"),
  suggestedRewrite: text("suggested_rewrite"),
  riskOverride: text("risk_override"),
  verificationStatus: text("verification_status"),
  needsReview: boolean("needs_review").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RhetoricTag = typeof rhetoricTagsTable.$inferSelect;
export type InsertRhetoricTag = typeof rhetoricTagsTable.$inferInsert;
