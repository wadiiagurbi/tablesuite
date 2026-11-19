// CORS for webhook-only Edge Functions. Browsers never legitimately call these
// (only pg_net does, and it sends no Origin), so by default no CORS headers are
// emitted at all. Set ALLOWED_ORIGINS (comma-separated) only if a trusted web
// client ever needs direct access.

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  if (origin !== "" && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    };
  }
  return {};
}

export function jsonHeaders(req: Request): Record<string, string> {
  return { ...corsHeadersFor(req), "Content-Type": "application/json" };
}
