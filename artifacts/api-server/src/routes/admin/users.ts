import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db";
import { desc, eq, count } from "drizzle-orm";
import { requireRole } from "../../lib/auth";

const router = Router();

const mapUser = (u: typeof adminUsersTable.$inferSelect) => ({
  id: u.id, username: u.username, role: u.role, isActive: u.isActive,
  createdAt: u.createdAt.toISOString(), lastLogin: u.lastLogin?.toISOString() ?? null,
});

router.get("/admin/users", requireRole("super_admin"), async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  try {
    const [users, total] = await Promise.all([
      db.select().from(adminUsersTable).orderBy(desc(adminUsersTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(adminUsersTable),
    ]);
    res.json({ users: users.map(mapUser), total: total[0]?.count ?? 0, page, limit });
  } catch (err) {
    req.log.error(err, "admin users list error");
    res.status(500).json({ error: "載入失敗" });
  }
});

router.post("/admin/users", requireRole("super_admin"), async (req, res) => {
  const { username, password, role } = req.body as { username?: string; password?: string; role?: string };
  if (!username || !password || !role) { res.status(400).json({ error: "帳號、密碼、角色為必填" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "密碼至少 6 位" }); return; }
  try {
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(adminUsersTable).values({
      username, passwordHash: hash, role: role as "super_admin" | "content_reviewer" | "readonly",
    }).returning();
    res.status(201).json(mapUser(user));
  } catch (err: unknown) {
    req.log.error(err, "admin user create error");
    const msg = err instanceof Error && err.message.includes("unique") ? "帳號已存在" : "新增失敗";
    res.status(500).json({ error: msg });
  }
});

router.patch("/admin/users/:id", requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }

  // Prevent deleting last super_admin
  const { role, isActive, password } = req.body as { role?: string; isActive?: boolean; password?: string };
  const updates: Partial<typeof adminUsersTable.$inferInsert> = {};
  if (role !== undefined) updates.role = role as "super_admin" | "content_reviewer" | "readonly";
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) {
    if (password.length < 6) { res.status(400).json({ error: "密碼至少 6 位" }); return; }
    updates.passwordHash = await bcrypt.hash(password, 12);
  }
  try {
    const [updated] = await db.update(adminUsersTable).set(updates).where(eq(adminUsersTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "找不到" }); return; }
    res.json(mapUser(updated));
  } catch (err) {
    req.log.error(err, "admin user update error");
    res.status(500).json({ error: "更新失敗" });
  }
});

router.delete("/admin/users/:id", requireRole("super_admin"), async (req, res) => {
  const id = parseInt(req.params["id"] as string);
  if (isNaN(id)) { res.status(400).json({ error: "無效 ID" }); return; }

  // Check: prevent self-delete
  if (req.session?.user?.id === id) { res.status(400).json({ error: "不能刪除自己的帳號" }); return; }

  try {
    const deleted = await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ error: "找不到" }); return; }
    res.json({ success: true, message: "已刪除" });
  } catch (err) {
    req.log.error(err, "admin user delete error");
    res.status(500).json({ error: "刪除失敗" });
  }
});

export default router;
