import { useEffect, useRef, useState } from "react";
import { Clock, Envelope, MapPin, Phone } from "@phosphor-icons/react";
import SectionHeader from "../components/SectionHeader";
import { useTenant } from "../context/TenantContext";
import { supabase } from "../lib/supabaseClient";

const INFO_ROWS = [
  { key: "address", label: "Address", Icon: MapPin },
  { key: "phone", label: "Phone", Icon: Phone },
  { key: "email", label: "Email", Icon: Envelope },
];

export default function Contact() {
  const { tenant } = useTenant();
  const hours = tenant.hours ?? {};
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | sent | error
  const errorRef = useRef(null);

  useEffect(() => {
    if (status === "error") {
      errorRef.current?.focus();
    }
  }, [status]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    const { error } = await supabase.from("contact_messages").insert({
      tenant_id: tenant.id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    });
    if (error) {
      setStatus("error");
      return;
    }
    setStatus("sent");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const inputClass =
    "w-full px-4 py-3 border border-dark/20 rounded-sm bg-white focus:outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold";

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-5xl md:text-6xl font-semibold text-dark mb-4 text-balance">
            Contact us
          </h1>
          <p className="text-dark/60 text-lg max-w-xl leading-relaxed">
            Questions, special requests, or just saying hello. We read everything.
          </p>
        </div>
      </section>

      {/* Info + map */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <div className="space-y-6">
              {INFO_ROWS.filter((row) => tenant[row.key]).map((row) => (
                <div key={row.key} className="flex gap-5">
                  <span
                    aria-hidden="true"
                    className="w-11 h-11 rounded-full border border-dark/20 flex items-center justify-center shrink-0 text-gold-dark"
                  >
                    <row.Icon size={20} />
                  </span>
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-dark mb-1">{row.label}</h2>
                    <p className="text-dark/60 text-sm leading-relaxed">{tenant[row.key]}</p>
                  </div>
                </div>
              ))}

              <div className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="w-11 h-11 rounded-full border border-dark/20 flex items-center justify-center shrink-0 text-gold-dark"
                >
                  <Clock size={20} />
                </span>
                <div>
                  <h2 className="font-serif text-xl font-semibold text-dark mb-1">Hours</h2>
                  <div className="space-y-1">
                    {Object.entries(hours).map(([day, time]) => (
                      <div key={day} className="flex justify-between text-sm text-dark/60 gap-8">
                        <span>{day}</span>
                        <span className="tabular-nums">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="aspect-square lg:aspect-auto lg:min-h-[420px] bg-cream-dark rounded-sm overflow-hidden">
            {tenant.address ? (
              <iframe
                title={`Map to ${tenant.name}`}
                className="w-full h-full border-0"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(tenant.address)}&output=embed`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-dark/40 text-sm">
                Add an address to show a map here.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <SectionHeader title="Send a message" subtitle="We reply within one business day" />

          {status === "sent" ? (
            <div className="mt-6 text-center py-8 bg-white border border-dark/10 rounded-sm" role="status" aria-live="polite">
              <p className="text-dark/70 mb-4">Thanks. Your message is on its way.</p>
              <button
                onClick={() => setStatus("idle")}
                className="text-sm font-semibold text-gold-dark underline underline-offset-4 decoration-gold/40 hover:decoration-gold-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 mt-6 bg-white border border-dark/10 rounded-sm p-6 md:p-10">
              {status === "error" && (
                <p
                  ref={errorRef}
                  tabIndex={-1}
                  aria-live="polite"
                  className="text-sm text-red-700 focus:outline-none"
                >
                  Something went wrong. Please check your details and try again.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-dark mb-2">Name</label>
                  <input
                    type="text"
                    id="contact-name"
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
                  <label htmlFor="contact-email" className="block text-sm font-medium text-dark mb-2">Email</label>
                  <input
                    type="email"
                    id="contact-email"
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
                <label htmlFor="contact-subject" className="block text-sm font-medium text-dark mb-2">Subject</label>
                <input
                  type="text"
                  id="contact-subject"
                  name="subject"
                  required
                  maxLength={200}
                  autoComplete="off"
                  value={formData.subject}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-dark mb-2">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows="5"
                  required
                  maxLength={5000}
                  autoComplete="off"
                  value={formData.message}
                  onChange={handleChange}
                  className={`${inputClass} resize-none`}
                  placeholder="Your message…"
                />
              </div>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-4 bg-dark text-cream font-semibold text-sm hover:bg-dark-light active:scale-[0.98] transition rounded-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {status === "submitting" ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
