/* eslint-disable react/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAdminTenant } from "../../context/AdminTenantContext";

const SOCIAL_PLATFORMS = ["instagram", "facebook", "twitter"];

export default function RestaurantSettings() {
  const { tenant, refresh } = useAdminTenant();
  const [form, setForm] = useState(null);
  const [hoursRows, setHoursRows] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [formError, setFormError] = useState(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (!tenant) return;
    setForm({
      name: tenant.name ?? "",
      tagline: tenant.tagline ?? "",
      description: tenant.description ?? "",
      address: tenant.address ?? "",
      phone: tenant.phone ?? "",
      email: tenant.email ?? "",
      social: { instagram: "", facebook: "", twitter: "", ...(tenant.social ?? {}) },
    });
    setHoursRows(Object.entries(tenant.hours ?? {}).map(([day, time]) => ({ day, time })));
    setStatus("idle");
    setFormError(null);
  }, [tenant]);

  if (!tenant) {
    return <p className="text-dark/40">Select a restaurant to edit its settings.</p>;
  }
  if (!form) {
    return <p className="text-dark/40">Loading…</p>;
  }

  const updateField = (field, value) => setForm({ ...form, [field]: value });
  const updateSocial = (platform, value) =>
    setForm({ ...form, social: { ...form.social, [platform]: value } });

  const updateHoursRow = (index, field, value) => {
    const next = [...hoursRows];
    next[index] = { ...next[index], [field]: value };
    setHoursRows(next);
  };
  const addHoursRow = () => setHoursRows([...hoursRows, { day: "", time: "" }]);
  const removeHoursRow = (index) => setHoursRows(hoursRows.filter((_, i) => i !== index));

  const fail = (message) => {
    setFormError(message);
    setStatus("error");
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      fail("Restaurant name is required.");
      return;
    }

    const seenDays = new Set();
    const hours = {};
    for (const row of hoursRows) {
      const day = row.day.trim();
      const time = row.time.trim();
      if (day === "" && time === "") continue;
      if (day === "") {
        fail("Every hours row needs a day.");
        return;
      }
      if (time === "") {
        fail(`Opening hours for "${day}" are missing.`);
        return;
      }
      const key = day.toLowerCase();
      if (seenDays.has(key)) {
        fail(`"${day}" appears twice. Merge the rows into one.`);
        return;
      }
      seenDays.add(key);
      hours[day] = time;
    }

    const social = Object.fromEntries(
      Object.entries(form.social)
        .map(([platform, url]) => [platform, (url ?? "").trim()])
        .filter(([, url]) => url !== "")
    );

    setStatus("saving");
    const { error } = await supabase
      .from("tenants")
      .update({
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        social,
        hours,
      })
      .eq("id", tenant.id);

    if (error) {
      fail("Settings could not be saved. Please try again.");
      return;
    }
    await refresh();
    setStatus("saved");
  };

  const fieldClass = "w-full px-4 py-3 border border-dark/20 rounded-sm bg-cream/50";

  return (
    <div className="max-w-3xl">
      <div className="mb-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Restaurant profile</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-dark">Restaurant settings</h1>
        <p className="mt-2 text-dark/60">Update how your restaurant looks and feels to guests online.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-sm shadow-[0_18px_38px_rgba(28,24,20,0.04)] space-y-6">
        {status === "error" && formError && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-red-700 focus:outline-none">
            {formError}
          </p>
        )}
        {status === "saved" && (
          <p role="status" className="text-sm text-green-700">Saved.</p>
        )}

        <section className="rounded-sm border border-dark/10 bg-cream/40 p-4 md:p-5">
          <h2 className="font-serif text-2xl font-semibold text-dark">Profile basics</h2>
          <div className="mt-4 space-y-5">
            <div>
              <label htmlFor="settings-name" className="block text-sm font-medium text-dark mb-2">Name</label>
              <input
                id="settings-name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="settings-tagline" className="block text-sm font-medium text-dark mb-2">Tagline</label>
              <input
                id="settings-tagline"
                value={form.tagline}
                onChange={(e) => updateField("tagline", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="settings-description" className="block text-sm font-medium text-dark mb-2">Description</label>
              <textarea
                id="settings-description"
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className={`${fieldClass} resize-none`}
              />
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-dark/10 bg-white p-4 md:p-5">
          <h2 className="font-serif text-2xl font-semibold text-dark">Contact & hours</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="settings-address" className="block text-sm font-medium text-dark mb-2">Address</label>
              <input
                id="settings-address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="settings-phone" className="block text-sm font-medium text-dark mb-2">Phone</label>
              <input
                id="settings-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="settings-email" className="block text-sm font-medium text-dark mb-2">Email</label>
            <input
              id="settings-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={fieldClass}
            />
            <p className="text-xs text-dark/40 mt-1">
              Reservation and message notifications are sent here.
            </p>
          </div>

          <div className="mt-6">
            <span id="hours-label" className="block text-sm font-medium text-dark mb-2">Hours</span>
            <div className="space-y-2" role="group" aria-labelledby="hours-label">
              {hoursRows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    aria-label={`Hours row ${i + 1} day`}
                    value={row.day}
                    onChange={(e) => updateHoursRow(i, "day", e.target.value)}
                    placeholder="Monday - Thursday"
                    className="flex-1 px-4 py-2 border border-dark/20 rounded-sm bg-cream/50 text-sm"
                  />
                  <input
                    aria-label={`Hours row ${i + 1} time`}
                    value={row.time}
                    onChange={(e) => updateHoursRow(i, "time", e.target.value)}
                    placeholder="5:00 PM - 10:00 PM"
                    className="flex-1 px-4 py-2 border border-dark/20 rounded-sm bg-cream/50 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeHoursRow(i)}
                    aria-label={`Remove hours row ${i + 1}`}
                    className="px-3 text-dark/40 hover:text-red-600"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addHoursRow}
              className="mt-2 text-sm text-gold-dark font-medium"
            >
              + Add hours row
            </button>
          </div>
        </section>

        <section className="rounded-sm border border-dark/10 bg-white p-4 md:p-5">
          <h2 className="font-serif text-2xl font-semibold text-dark">Social links</h2>
          <div className="mt-4 space-y-2" role="group" aria-labelledby="social-label">
            {SOCIAL_PLATFORMS.map((platform) => (
              <input
                key={platform}
                aria-label={`${platform} URL`}
                value={form.social[platform] ?? ""}
                onChange={(e) => updateSocial(platform, e.target.value)}
                placeholder={`https://${platform}.com/yourrestaurant`}
                className="w-full px-4 py-2 border border-dark/20 rounded-sm bg-cream/50 text-sm"
              />
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={status === "saving"}
          className="px-8 py-3 bg-dark text-white text-sm font-semibold rounded-sm hover:bg-dark-light transition-colors disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
