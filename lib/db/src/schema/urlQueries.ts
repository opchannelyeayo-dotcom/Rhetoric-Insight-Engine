import { pgTable, serial, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const urlStatusEnum = pgEnum("url_status", ["safe", "suspicious", "high_risk", "unknown"]);

export const urlQueriesTable = pgTable("url_queries", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  status: urlStatusEnum("status").notNull().default("unknown"),
  reason: text("reason").notNull(),
  isTest: boolean("is_test").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UrlQuery = typeof urlQueriesTable.$inferSelect;
export type InsertUrlQuery = typeof urlQueriesTable.$inferInsert;
