// Triggered by the on_contact_message_created Database Webhook (see
// supabase/migrations/0003_notification_webhooks.sql) whenever a row is inserted into
// `contact_messages` — the client never decides whether this notification is sent.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireInvoker } from "../_shared/auth.ts";
import { corsHeadersFor, jsonHeaders } from "../_shared/cors.ts";
import {
  badRequest,
  cleanSubject,
  cleanText,
  escapeHtml,
  isEmail,
  isUuid,
} from "../_shared/validate.ts";

const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "contact@example.com";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email send", { to, subject });
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Resend API error", res.status, await res.text());
    return false;
  }
  return true;
}

async function markLog(supabase: NonNullable<ReturnType<typeof getServiceClient>>, logId: string, status: "sent" | "failed", lastError: string | null) {
  const { error } = await supabase
    .from("notification_log")
    .update({ status, last_error: lastError, attempts: 1 })
    .eq("id", logId);
  if (error) {
    console.error("notification_log update failed", error.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
      status: 405,
      headers: jsonHeaders(req),
    });
  }

  const rejected = requireInvoker(req);
  if (rejected) {
    return rejected;
  }

  const supabase = getServiceClient();
  if (!supabase) {
    console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    return new Response(JSON.stringify({ ok: false, error: "not configured" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }

  try {
    const body = await req.json().catch(() => null);
    const record = body?.record;
    const logId = typeof body?.log_id === "string" ? body.log_id : null;
    const fail = async (message: string) => {
      if (logId && isUuid(logId)) {
        await markLog(supabase, logId, "failed", message);
      }
      return badRequest(message);
    };

    if (!record || typeof record !== "object") return await fail("missing record");
    const { tenant_id } = record;
    if (!isUuid(tenant_id)) return await fail("invalid tenant_id");

    const name = cleanText(record.name, 120);
    const email = isEmail(record.email) ? record.email : null;
    const subject = cleanText(record.subject, 200);
    const message = cleanText(record.message, 5000);
    if (!name || !email || !subject || !message) {
      return await fail("invalid contact fields");
    }

    const { data: tenant, error } = await supabase
      .from("tenants")
      .select("name, email")
      .eq("id", tenant_id)
      .single();

    if (error || !tenant) {
      return await fail("tenant not found");
    }

    let delivered = true;
    if (tenant.email) {
      if (!isEmail(tenant.email)) {
        console.error("tenant email invalid, skipping owner mail", { tenant_id });
      } else {
        delivered =
          (await sendEmail(
            tenant.email,
            cleanSubject(`New contact message: ${subject}`),
            `<h2>New message from ${escapeHtml(name)}</h2>` +
              `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` +
              `<p>${escapeHtml(message)}</p>`,
          )) && delivered;
      }
    }

    if (logId && isUuid(logId)) {
      await markLog(supabase, logId, delivered ? "sent" : "failed", delivered ? null : "email delivery failed");
    }
    if (!delivered) {
      return new Response(JSON.stringify({ ok: false, error: "email delivery failed" }), {
        status: 502,
        headers: jsonHeaders(req),
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: jsonHeaders(req),
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "internal error" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }
});
