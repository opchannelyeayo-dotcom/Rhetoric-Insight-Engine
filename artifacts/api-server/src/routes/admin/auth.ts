import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../lib/auth";

const router = Router();

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "請提供帳號與密碼" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, username))
      .limit(1);

    if (!user || !user.isActive) {
      res.status(401).json({ error: "帳號或密碼錯誤" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "帳號或密碼錯誤" });
      return;
    }

    // Update last login
    await db
      .update(adminUsersTable)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsersTable.id, user.id));

    req.session.user = { id: user.id, username: user.username, role: user.role };

    res.json({
      success: true,
      message: "登入成功",
      user: { loggedIn: true, username: user.username, role: user.role },
    });
  } catch (err) {
    req.log.error(err, "admin login error");
    res.status(500).json({ error: "登入失敗，請稍後再試" });
  }
});

router.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "已登出" });
  });
});

router.get("/admin/me", (req, res) => {
  if (!req.session?.user) {
    res.status(401).json({ error: "未登入" });
    return;
  }
  res.json({
    loggedIn: true,
    username: req.session.user.username,
    role: req.session.user.role,
  });
});

export default router;
