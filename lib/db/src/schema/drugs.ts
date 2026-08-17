import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const drugsTable = pgTable("drugs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  approvalNumber: text("approval_number").notNull(),
  manufacturer: text("manufacturer").notNull(),
  category: text("category").notNull().default("藥品"),
  approvedDate: text("approved_date"),
  ingredients: text("ingredients"),
  claims: text("claims"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Drug = typeof drugsTable.$inferSelect;
export type InsertDrug = typeof drugsTable.$inferInsert;
