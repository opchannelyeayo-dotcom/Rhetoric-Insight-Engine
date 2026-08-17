import { Request, Response, NextFunction } from "express";

export type UserRole = "super_admin" | "content_reviewer" | "readonly";

export interface SessionUser {
  id: number;
  username: string;
  role: UserRole;
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session?.user) {
    res.status(401).json({ error: "未授權，請先登入後台" });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      res.status(401).json({ error: "未授權，請先登入後台" });
      return;
    }
    if (!roles.includes(req.session.user.role)) {
      res.status(403).json({ error: "權限不足" });
      return;
    }
    next();
  };
}
