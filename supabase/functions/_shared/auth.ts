// Shared invoker check for DB-webhook Edge Functions (see
// supabase/migrations/0003_notification_webhooks.sql).
//
// Only the Postgres trigger (pg_net) knows EDGE_FUNCTION_SHARED_SECRET — the
// same value stored in Vault as `edge_function_key`. Browsers never call these
// functions directly, so any request without the exact secret gets a 401 before
// any body parsing, DB lookup, or email send happens.
//
// Setup (one time per project):
//   openssl rand -hex 32
//   select vault.create_secret('<that-value>', 'edge_function_key');
//   supabase secrets set EDGE_FUNCTION_SHARED_SECRET=<that-value>
// Deploy these functions with `--no-verify-jwt` so the gateway lets the shared
// secret through to this in-code check.

function unauthorized(): Response {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function misconfigured(): Response {
  console.error("EDGE_FUNCTION_SHARED_SECRET is not set — failing closed");
  return new Response(JSON.stringify({ ok: false, error: "not configured" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

/** Constant-time byte comparison (length check first; secret length is fixed). */
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** Returns null when the caller is the authorized invoker, else the rejection. */
export function requireInvoker(req: Request): Response | null {
  // Read per request so a rotated secret applies without redeploy.
  const secret = Deno.env.get("EDGE_FUNCTION_SHARED_SECRET");
  if (!secret) {
    return misconfigured();
  }
  const header = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = new TextEncoder().encode(header);
  const b = new TextEncoder().encode(expected);
  if (!safeEqual(a, b)) {
    return unauthorized();
  }
  return null;
}
