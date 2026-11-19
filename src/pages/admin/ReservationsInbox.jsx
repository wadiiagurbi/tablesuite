import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAdminTenant } from "../../context/AdminTenantContext";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const PAGE_SIZE = 25;

function statusStyle(status) {
  return STATUS_STYLES[status] ?? "bg-dark/5 text-dark/60";
}

export default function ReservationsInbox() {
  const { tenant } = useAdminTenant();
  const [reservations, setReservations] = useState([]);
  const [revenueDrafts, setRevenueDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Bumped whenever the selected tenant changes so a load that is already in
  // flight for the previous tenant can no longer write to state.
  const loadGeneration = useRef(0);

  const load = async (append = false) => {
    if (!tenant) return;
    const generation = loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    const from = append ? page * PAGE_SIZE : 0;
    const query = supabase
      .from("reservations")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (isStale()) return;
    if (error) {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
      setLoadError("Reservations could not be loaded. Please try again.");
      return;
    }

    const nextReservations = append ? [...reservations, ...(data ?? [])] : (data ?? []);
    setReservations(nextReservations);
    setRevenueDrafts((drafts) => ({
      ...drafts,
      ...Object.fromEntries((data ?? []).map((reservation) => [reservation.id, reservation.revenue_amount ?? ""])),
    }));
    setHasMore((data ?? []).length === PAGE_SIZE);
    setPage((append ? page + 1 : 1));
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    loadGeneration.current += 1;
    setReservations([]);
    setPage(0);
    setStatusFilter("all");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  if (!tenant) {
    return <p className="text-dark/40">Select a restaurant to view its reservations.</p>;
  }

  const updateStatus = async (id, status) => {
    setActionError(null);
    const previous = reservations;
    setReservations(previous.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) {
      setReservations(previous);
      setActionError("Status could not be saved. Please try again.");
    }
  };

  const saveRevenue = async (id) => {
    setActionError(null);
    const rawAmount = revenueDrafts[id] ?? "";
    const revenue_amount = rawAmount === "" ? null : Number(rawAmount);
    if (revenue_amount !== null && (!Number.isFinite(revenue_amount) || revenue_amount < 0)) {
      setActionError("Revenue must be a non-negative amount.");
      return;
    }
    const { error } = await supabase.from("reservations")
      .update({ revenue_amount })
      .eq("id", id)
      .eq("tenant_id", tenant.id);
    if (error) {
      setActionError("Revenue could not be saved. Please try again.");
      return;
    }
    setReservations(reservations.map((reservation) => reservation.id === id
      ? { ...reservation, revenue_amount }
      : reservation));
  };

  const removeReservation = async (id) => {
    if (!confirm("Delete this reservation permanently?")) return;
    setActionError(null);
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) {
      setActionError("The reservation could not be deleted. Please try again.");
      return;
    }
    setReservations(reservations.filter((r) => r.id !== id));
  };

  const filteredReservations =
    statusFilter === "all"
      ? reservations
      : reservations.filter((reservation) => reservation.status === statusFilter);

  const summary = {
    all: reservations.length,
    pending: reservations.filter((reservation) => reservation.status === "pending").length,
    confirmed: reservations.filter((reservation) => reservation.status === "confirmed").length,
    cancelled: reservations.filter((reservation) => reservation.status === "cancelled").length,
  };

  return (
    <div>
      <div className="mb-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Reservation management</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-dark">Reservations</h1>
      </div>

      <div className="mb-6 rounded-sm border border-dark/10 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-dark/45">Summary</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "confirmed", label: "Confirmed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={
                statusFilter === filter.id
                  ? "rounded-full bg-dark px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-full border border-dark/10 bg-cream px-3 py-1.5 text-xs font-semibold text-dark/70"
              }
            >
              {filter.label} ({summary[filter.id]})
            </button>
          ))}
        </div>
      </div>

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
      {!loading && !loadError && filteredReservations.length === 0 && <p className="text-dark/40">No reservations yet.</p>}

      <div className="space-y-3">
        {filteredReservations.map((r) => (
          <div key={r.id} className="bg-white rounded-sm shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-semibold">{r.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle(r.status)}`}>{r.status}</span>
              </div>
              <p className="text-sm text-dark/50 tabular-nums">
                {r.date} at {r.time} · {r.guests} guests
              </p>
              <p className="text-sm text-dark/50">{r.email} · {r.phone}</p>
              {r.occasion && <p className="text-sm text-dark/50">Occasion: {r.occasion}</p>}
              {r.notes && <p className="text-sm text-dark/50">Notes: {r.notes}</p>}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs font-medium text-dark/60">
                  Recorded revenue (USD)
                  <input
                    aria-label={`Recorded revenue for ${r.name}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={revenueDrafts[r.id] ?? ""}
                    onChange={(event) => setRevenueDrafts({ ...revenueDrafts, [r.id]: event.target.value })}
                    className="w-36 rounded-sm border border-dark/15 bg-white px-3 py-2 text-sm text-dark"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => saveRevenue(r.id)}
                  className="rounded-sm border border-dark/15 px-3 py-2 text-xs font-semibold text-dark hover:border-gold"
                >
                  Save revenue
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus(r.id, "confirmed")}
                className="px-4 py-2 text-xs bg-green-600 text-white rounded-sm hover:bg-green-700"
              >
                Confirm
              </button>
              <button
                onClick={() => updateStatus(r.id, "cancelled")}
                className="px-4 py-2 text-xs bg-red-600 text-white rounded-sm hover:bg-red-700"
              >
                Cancel
              </button>
              <button
                onClick={() => removeReservation(r.id)}
                className="px-4 py-2 text-xs text-dark/40 hover:text-red-600"
              >
                Delete
              </button>
            </div>
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
