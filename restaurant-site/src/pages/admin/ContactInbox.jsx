import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAdminTenant } from "../../context/AdminTenantContext";

const STATUS_STYLES = {
  new: "bg-amber-100 text-amber-800",
  read: "bg-slate-100 text-slate-700",
  replied: "bg-green-100 text-green-800",
};

const PAGE_SIZE = 25;

function statusStyle(status) {
  return STATUS_STYLES[status] ?? "bg-dark/5 text-dark/60";
}

export default function ContactInbox() {
  const { tenant } = useAdminTenant();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (append = false) => {
    if (!tenant) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    const from = append ? messages.length : 0;
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      setLoading(false);
      setLoadingMore(false);
      setLoadError("Messages could not be loaded. Please try again.");
      return;
    }
    setMessages(append ? [...messages, ...(data ?? [])] : (data ?? []));
    setHasMore((data ?? []).length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    setMessages([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  if (!tenant) {
    return <p className="text-dark/40">Select a restaurant to view its messages.</p>;
  }

  const updateStatus = async (id, status) => {
    setActionError(null);
    const previous = messages;
    setMessages(previous.map((m) => (m.id === id ? { ...m, status } : m)));
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) {
      setMessages(previous);
      setActionError("Status could not be saved. Please try again.");
    }
  };

  const removeMessage = async (id) => {
    if (!confirm("Delete this message permanently?")) return;
    setActionError(null);
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) {
      setActionError("The message could not be deleted. Please try again.");
      return;
    }
    setMessages(messages.filter((m) => m.id !== id));
  };

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-dark mb-8">Messages</h1>

      {loading && <p className="text-dark/40">Loading…</p>}
      {loadError && (
        <div className="mb-4">
          <p role="alert" className="text-sm text-red-700 mb-2">{loadError}</p>
          <button onClick={() => load()} className="text-sm text-gold-dark underline underline-offset-4">
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-red-700 mb-4">{actionError}</p>
      )}
      {!loading && !loadError && messages.length === 0 && <p className="text-dark/40">No messages yet.</p>}

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="bg-white rounded-sm shadow-sm p-5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">{m.subject}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle(m.status)}`}>{m.status}</span>
                </div>
                <p className="text-sm text-dark/50">
                  {m.name} · {m.email}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {m.status !== "read" && m.status !== "replied" && (
                  <button
                    onClick={() => updateStatus(m.id, "read")}
                    className="px-3 py-1.5 text-xs bg-slate-600 text-white rounded-sm hover:bg-slate-700"
                  >
                    Mark read
                  </button>
                )}
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`}
                  className="px-3 py-1.5 text-xs bg-gold text-dark rounded-sm hover:bg-gold-light"
                >
                  Reply
                </a>
                {m.status !== "replied" && (
                  <button
                    onClick={() => updateStatus(m.id, "replied")}
                    title="Mark as replied after answering"
                    className="px-3 py-1.5 text-xs border border-dark/20 rounded-sm hover:bg-dark hover:text-white transition-colors"
                  >
                    Mark replied
                  </button>
                )}
                <button
                  onClick={() => removeMessage(m.id)}
                  className="px-3 py-1.5 text-xs text-dark/40 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-sm text-dark/70 mt-3">{m.message}</p>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => load(true)}
          disabled={loadingMore}
          className="mt-6 px-6 py-3 border border-dark/20 text-sm rounded-sm hover:bg-dark hover:text-white transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
