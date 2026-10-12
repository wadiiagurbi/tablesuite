import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAdminTenant } from "../../context/AdminTenantContext";

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { tenant } = useAdminTenant();
  const [counts, setCounts] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState(null);
  // Bumped whenever the selected tenant changes so a load that is already in
  // flight for the previous tenant can no longer write to state.
  const loadGeneration = useRef(0);

  const load = async () => {
    if (!tenant) return;
    const generation = loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setError(null);
    try {
      const today = new Date();
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 89);
      const [items, images, pendingReservations, confirmedReservations, cancelledReservations, newMessages, bookingHistory] = await Promise.all([
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("gallery_images").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("status", "pending"),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("status", "confirmed"),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("status", "cancelled"),
        supabase
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("status", "new"),
        supabase
          .from("reservations")
          .select("date, status, revenue_amount")
          .eq("tenant_id", tenant.id)
          .gte("date", localDateKey(startDate))
          .lte("date", localDateKey(endDate)),
      ]);
      if (isStale()) return;
      const failed = [items, images, pendingReservations, confirmedReservations, cancelledReservations, newMessages, bookingHistory].find((r) => r.error);
      if (failed) {
        setError("Dashboard numbers could not be loaded. Please try again.");
        return;
      }
      setReservations(bookingHistory.data ?? []);
      setCounts({
        items: items.count ?? 0,
        images: images.count ?? 0,
        pendingReservations: pendingReservations.count ?? 0,
        confirmedReservations: confirmedReservations.count ?? 0,
        cancelledReservations: cancelledReservations.count ?? 0,
        newMessages: newMessages.count ?? 0,
      });
    } catch {
      if (isStale()) return;
      setError("Dashboard numbers could not be loaded. Please check your connection and try again.");
    }
  };

  useEffect(() => {
    loadGeneration.current += 1;
    setCounts(null);
    setReservations([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  if (!tenant) {
    return <p className="text-dark/40">Select a restaurant to view its dashboard.</p>;
  }

  const tiles = [
    {
      label: "Pending reservations",
      value: counts?.pendingReservations,
      to: "/admin/reservations",
      accent: "bg-gold/10 text-gold-dark",
    },
    {
      label: "New messages",
      value: counts?.newMessages,
      to: "/admin/messages",
      accent: "bg-cream-dark text-dark",
    },
    {
      label: "Menu items",
      value: counts?.items,
      to: "/admin/menu",
      accent: "bg-[#efe4d8] text-dark",
    },
    {
      label: "Gallery photos",
      value: counts?.images,
      to: "/admin/gallery",
      accent: "bg-[#eef3ea] text-dark",
    },
  ];

  const quickActions = [
    { label: "Add a menu item", to: "/admin/menu", tone: "primary" },
    { label: "View reservations", to: "/admin/reservations", tone: "secondary" },
    { label: "Review messages", to: "/admin/messages", tone: "secondary" },
  ];

  const chartEnd = new Date();
  const chartStart = new Date(chartEnd.getFullYear(), chartEnd.getMonth(), chartEnd.getDate());
  chartStart.setDate(chartStart.getDate() - period + 1);
  const chartDays = Array.from({ length: period }, (_, index) => {
    const date = new Date(chartStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const points = chartDays.map((date) => {
    const key = localDateKey(date);
    const dayReservations = reservations.filter((reservation) => reservation.date === key);
    return {
      key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bookings: dayReservations.filter((reservation) => reservation.status !== "cancelled").length,
      revenue: dayReservations
        .filter((reservation) => reservation.status === "confirmed")
        .reduce((total, reservation) => total + (Number(reservation.revenue_amount) || 0), 0),
    };
  });
  const visiblePoints = points.filter((_, index) => period === 7 || index % (period === 30 ? 5 : 15) === 0 || index === points.length - 1);
  const bookingTotal = points.reduce((total, point) => total + point.bookings, 0);
  const revenueTotal = points.reduce((total, point) => total + point.revenue, 0);
  const maxBookings = Math.max(1, ...points.map((point) => point.bookings));
  const maxRevenue = Math.max(1, ...points.map((point) => point.revenue));

  return (
    <div>
      <div className="mb-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Restaurant overview</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-dark">{tenant.name}</h1>
        <p className="mt-2 text-dark/50">/site/{tenant.slug}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-4">
          <p role="alert" className="text-sm text-red-700 mb-2">{error}</p>
          <button onClick={load} className="text-sm text-gold-dark underline underline-offset-4">
            Retry
          </button>
        </div>
      )}

      <section className="mb-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold text-dark">Reservation analytics</h2>
          <div className="flex gap-1" aria-label="Analytics date range">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={period === days}
                onClick={() => setPeriod(days)}
                className={period === days
                  ? "rounded-sm bg-dark px-3 py-2 text-xs font-semibold text-white"
                  : "rounded-sm border border-dark/10 px-3 py-2 text-xs font-semibold text-dark/60 hover:border-gold"}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="border-l-2 border-gold pl-3">
            <p className="text-2xl font-serif font-bold tabular-nums text-dark">{bookingTotal}</p>
            <p className="text-xs text-dark/55">Bookings, excluding cancellations</p>
          </div>
          <div className="border-l-2 border-green-700 pl-3">
            <p className="text-2xl font-serif font-bold tabular-nums text-dark">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(revenueTotal)}</p>
            <p className="text-xs text-dark/55">Recorded revenue from confirmed reservations</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-dark">Bookings by reservation date</h3>
              <span className="text-xs text-dark/45">per day</span>
            </div>
            <div role="img" aria-label={`Bookings per day for the last ${period} days`} className="flex h-36 items-end gap-[3px] border-b border-dark/10 px-1">
              {points.map((point) => (
                <div
                  key={point.key}
                  title={`${point.label}: ${point.bookings} bookings`}
                  className="min-w-0 flex-1 rounded-t-[2px] bg-gold/80 hover:bg-gold"
                  style={{ height: `${Math.max(2, (point.bookings / maxBookings) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-dark/45">
              {visiblePoints.map((point) => <span key={point.key}>{point.label}</span>)}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-dark">Recorded revenue</h3>
              <span className="text-xs text-dark/45">USD per day</span>
            </div>
            <div role="img" aria-label={`Recorded revenue per day for the last ${period} days`} className="flex h-36 items-end gap-[3px] border-b border-dark/10 px-1">
              {points.map((point) => (
                <div
                  key={point.key}
                  title={`${point.label}: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(point.revenue)}`}
                  className="min-w-0 flex-1 rounded-t-[2px] bg-green-700/75 hover:bg-green-700"
                  style={{ height: `${Math.max(2, (point.revenue / maxRevenue) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-dark/45">
              {visiblePoints.map((point) => <span key={point.key}>{point.label}</span>)}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-dark/45">Revenue is staff-recorded per confirmed reservation; it is not imported from a payment provider.</p>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Confirmed bookings", value: counts?.confirmedReservations ?? "…" },
            { label: "Pending requests", value: counts?.pendingReservations ?? "…" },
            { label: "Cancelled", value: counts?.cancelledReservations ?? "…" },
            { label: "New messages", value: counts?.newMessages ?? "…" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-sm border border-dark/10 bg-cream p-4">
              <p className="text-3xl font-serif font-bold text-dark tabular-nums">{metric.value}</p>
              <p className="mt-2 text-sm text-dark/60">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold text-dark">Quick actions</h2>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-dark/45">Daily ops</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={
                action.tone === "primary"
                  ? "rounded-sm bg-dark px-4 py-3 text-sm font-semibold text-cream transition-colors hover:bg-dark-light"
                  : "rounded-sm border border-dark/10 bg-cream px-4 py-3 text-sm font-semibold text-dark transition-colors hover:border-gold hover:text-gold-dark"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            to={tile.to}
            className={`rounded-sm border border-dark/10 p-6 shadow-[0_16px_28px_rgba(28,24,20,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_32px_rgba(28,24,20,0.08)] ${tile.accent}`}
          >
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-xs font-semibold uppercase tracking-[0.08em]">
              {tile.label.charAt(0)}
            </div>
            <p className="text-3xl font-serif font-bold tabular-nums">{tile.value ?? "…"}</p>
            <p className="mt-2 text-sm text-dark/60">{tile.label}</p>
          </Link>
        ))}
      </div>

      {counts && counts.items === 0 && (
        <div className="mt-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
          <p className="text-dark/70 text-sm">
            Your menu is empty. Head to{" "}
            <Link to="/admin/menu" className="text-gold-dark font-medium">
              Menu
            </Link>{" "}
            to add your first dish.
          </p>
        </div>
      )}
    </div>
  );
}
