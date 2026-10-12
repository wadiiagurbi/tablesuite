// Shared validation + escaping for webhook Edge Functions. Every field that
// reaches an email (to, subject, html) or a query passes through here first.

/* eslint-disable no-control-regex */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Intentional: strip control characters before storing or sending text.
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(CONTROL_CHARS_RE, "").trim();
  if (cleaned === "") return null;
  return cleaned.slice(0, maxLength);
}

/** Optional free-text field: null when absent, still length-capped. */
export function cleanOptionalText(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return cleanText(value, maxLength);
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Email subjects must never carry raw newlines (header injection). */
export function cleanSubject(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
}

export function badRequest(message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
