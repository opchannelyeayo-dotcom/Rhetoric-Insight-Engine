/**
 * 將前台分析結果安全地轉發給獨立後台 API。
 * - ADMIN_API_URL 未設定 → 靜默略過
 * - 後台暫時不可用 / 逾時 → 記錄 warning，不影響前台回應
 */

const ADMIN_API_URL = process.env["ADMIN_API_URL"]?.replace(/\/+$/, "") ?? "";
const ADMIN_API_TOKEN = process.env["ADMIN_API_TOKEN"] ?? "";
const FORWARD_TIMEOUT_MS = 5000;

export async function forwardToAdmin(
  path: string,
  payload: unknown,
  log?: { warn: (obj: unknown, msg: string) => void }
): Promise<void> {
  if (!ADMIN_API_URL) return;

  const url = `${ADMIN_API_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ADMIN_API_TOKEN ? { Authorization: `Bearer ${ADMIN_API_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!resp.ok) {
      log?.warn(
        { status: resp.status, url },
        "Admin forward: non-OK response"
      );
    }
  } catch (err) {
    // AbortError (timeout) or network error — log only, don't throw
    const isTimeout = err instanceof Error && err.name === "AbortError";
    log?.warn(
      { err: isTimeout ? "timeout" : String(err), url },
      "Admin forward: failed (non-fatal)"
    );
  } finally {
    clearTimeout(timer);
  }
}
