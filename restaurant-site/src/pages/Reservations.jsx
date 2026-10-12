import { useEffect, useRef, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { useTenant } from "../context/TenantContext";
import { supabase } from "../lib/supabaseClient";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  guests: "2",
  occasion: "",
  notes: "",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const LARGE_PARTY_NOTE =
  "For parties of 9 or more, please call us directly and we will arrange the table.";

// Hours are free-form { day: time } rows and tenants commonly use range keys
// such as "Monday - Thursday", so match the weekday against every token of the
// key. Returns the time string, or null when the day is not listed.
function hoursForDay(hours, dayName) {
  const needle = dayName.slice(0, 3).toLowerCase();
  const match = Object.entries(hours ?? {}).find(([key, time]) => {
    if (typeof time !== "string" || time.trim() === "") return false;
    return key
      .split(/[-\s]+/)
      .some((part) => part.replace(/[^a-z]/gi, "").toLowerCase().startsWith(needle));
  });
  return match ? match[1].trim() : null;
}

export default function Reservations() {
  const { tenant } = useTenant();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  useEffect(() => {
    if (submitted) {
      successRef.current?.focus();
    }
  }, [submitted]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.guests === "9+") {
      setError("For parties of 9 or more, please call us directly and we will arrange the table.");
      return;
    }
    const guestCount = Number.parseInt(formData.guests, 10);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 8) {
      setError("Please choose between 1 and 8 guests, or call us for larger parties.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("reservations").insert({
      tenant_id: tenant.id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      date: formData.date,
      time: formData.time,
      guests: String(guestCount),
      occasion: formData.occasion.trim() || null,
      notes: formData.notes.trim() || null,
    });

    setSubmitting(false);
    if (insertError) {
      setError("Something went wrong. Please check your details and try again.");
      return;
    }
    setSubmitted(true);
  };

  const timeSlots = [
    "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM",
    "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM",
  ];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dayName = DAY_NAMES[now.getDay()];
  const tonightHours = hoursForDay(tenant.hours, dayName);

  const confirmedDate = (() => {
    if (!formData.date) return null;
    const parsed = new Date(`${formData.date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  })();
  const inputClass =
    "w-full px-4 py-3 border border-dark/20 rounded-sm bg-white focus:outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold";

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">Reservations</p>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl font-semibold text-dark mb-4 text-balance">
            Book a table
          </h1>
          <p className="text-dark/60 text-lg max-w-2xl leading-relaxed">
            Tell us when to expect you and we will hold a table.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.14em] text-dark/55">
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">Easy requests</span>
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">Guest-first service</span>
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">Flexible timing</span>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-12 items-start">
          {submitted ? (
            <div className="bg-white border border-dark/10 rounded-sm p-6 md:p-10" role="status" aria-live="polite">
              <h2 ref={successRef} tabIndex={-1} className="font-serif text-3xl font-semibold text-dark mb-4 text-balance focus:outline-none">
                Request received
              </h2>
              <p className="text-dark/60 leading-relaxed mb-2">
                Thank you, {formData.name}. Your table for {formData.guests} on{" "}
                {confirmedDate ?? formData.date} at {formData.time} has been requested.
              </p>
              <p className="text-dark/40 text-sm">
                A confirmation email will be sent to {formData.email}.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData(EMPTY_FORM);
                }}
                className="mt-6 text-sm font-semibold text-gold-dark underline underline-offset-4 decoration-gold/40 hover:decoration-gold-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Make another reservation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-dark/10 p-6 md:p-10 rounded-sm">
              <SectionHeader title="Make a reservation" subtitle="Fill in the details below" />

              {error && (
                <p
                  ref={errorRef}
                  tabIndex={-1}
                  aria-live="polite"
                  className="mt-4 text-sm text-red-700 focus:outline-none"
                >
                  {error}
                </p>
              )}

              <div className="space-y-5 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="res-name" className="block text-sm font-medium text-dark mb-2">Full name</label>
                    <input
                      type="text"
                      id="res-name"
                      name="name"
                      required
                      maxLength={120}
                      autoComplete="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="res-email" className="block text-sm font-medium text-dark mb-2">Email</label>
                    <input
                      type="email"
                      id="res-email"
                      name="email"
                      required
                      maxLength={320}
                      autoComplete="email"
                      spellCheck={false}
                      value={formData.email}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="res-phone" className="block text-sm font-medium text-dark mb-2">Phone</label>
                  <input
                    type="tel"
                    id="res-phone"
                    name="phone"
                    required
                    maxLength={40}
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="(555) 010-2030"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="res-date" className="block text-sm font-medium text-dark mb-2">Date</label>
                    <input
                      type="date"
                      id="res-date"
                      name="date"
                      required
                      min={today}
                      value={formData.date}
                      onChange={handleChange}
                      className={`${inputClass} tabular-nums`}
                    />
                  </div>
                  <div>
                    <label htmlFor="res-time" className="block text-sm font-medium text-dark mb-2">Time</label>
                    <select
                      id="res-time"
                      name="time"
                      required
                      value={formData.time}
                      onChange={handleChange}
                      className={`${inputClass} bg-white text-dark`}
                    >
                      <option value="">Select time</option>
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="res-guests" className="block text-sm font-medium text-dark mb-2">Guests</label>
                    <select
                      id="res-guests"
                      name="guests"
                      value={formData.guests}
                      onChange={handleChange}
                      className={`${inputClass} bg-white text-dark`}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                      ))}
                      <option value="9+">9 or more (call us)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="res-occasion" className="block text-sm font-medium text-dark mb-2">Occasion <span className="text-dark/40 font-normal">(optional)</span></label>
                  <select
                    id="res-occasion"
                    name="occasion"
                    value={formData.occasion}
                    onChange={handleChange}
                    className={`${inputClass} bg-white text-dark`}
                  >
                    <option value="">Select occasion</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Date Night">Date night</option>
                    <option value="Business">Business dinner</option>
                    <option value="Celebration">Celebration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="res-notes" className="block text-sm font-medium text-dark mb-2">Special requests <span className="text-dark/40 font-normal">(optional)</span></label>
                  <textarea
                    id="res-notes"
                    name="notes"
                    rows="3"
                    maxLength={2000}
                    autoComplete="off"
                    value={formData.notes}
                    onChange={handleChange}
                    className={`${inputClass} resize-none`}
                    placeholder="Allergies, seating preferences…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-dark text-cream font-semibold text-sm hover:bg-dark-light active:scale-[0.98] transition rounded-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {submitting ? "Sending…" : "Request table"}
                </button>
              </div>
            </form>
          )}

          <aside
            aria-labelledby="res-good-to-know"
            className="bg-white border border-dark/10 rounded-sm p-6"
          >
            <h2
              id="res-good-to-know"
              className="font-serif text-2xl font-semibold text-dark mb-4"
            >
              Good to know
            </h2>
            <div className="space-y-5 text-sm leading-relaxed text-dark/60">
              {tenant.phone && (
                <p>
                  <a
                    href={`tel:${tenant.phone.replace(/[^\d+]/g, "")}`}
                    className="text-gold-dark font-semibold underline underline-offset-4 decoration-gold/40 hover:decoration-gold-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    {tenant.phone}
                  </a>
                </p>
              )}
              {tonightHours && (
                <p>
                  {dayName}, tonight <span className="tabular-nums">{tonightHours}</span>
                </p>
              )}
              <p className="text-dark/50 pt-5 border-t border-dark/10">
                {LARGE_PARTY_NOTE}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
