const STATIC = new Set([
  "https://franckdavion.github.io",
  "http://192.168.0.146:8765",
  "http://192.168.0.146:8000",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "http://127.0.0.1:8766",
  "http://localhost:8766",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
  "https://carnets-menus.vercel.app",
  "https://carnets-menus-franckdavion.vercel.app"
]);

export function originOk(origin: string) {
  if (!origin) return false;
  if (STATIC.has(origin)) return true;
  try {
    const h = new URL(origin).hostname.toLowerCase();
    return h === "carnets-menus.vercel.app"
      || h === "carnets-menus-franckdavion.vercel.app"
      || /^carnets-menus-[a-z0-9]+-franckdavion\.vercel\.app$/.test(h);
  } catch {
    return false;
  }
}

export function cors(req: Request, extra: Record<string, string> = {}) {
  const origin = req.headers.get("Origin") || req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": originOk(origin) ? origin : "https://carnets-menus.vercel.app",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
    ...extra
  };
}
