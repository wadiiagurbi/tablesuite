import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTenant } from "../context/TenantContext";
import { useMenu } from "../hooks/useMenu";
import { useGallery } from "../hooks/useGallery";
import { formatPrice } from "../lib/format";
import Reveal from "../components/Reveal";
import HoverPreview from "../components/HoverPreview";

export default function Menu() {
  const { tenant } = useTenant();
  const { categories, loading, error } = useMenu(tenant.id);
  const { images } = useGallery(tenant.id);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const reduce = useReducedMotion();

  const active = categories.find((category) => category.id === activeCategoryId) ?? categories[0] ?? null;
  const activeIndex = active ? Math.max(0, categories.findIndex((category) => category.id === active.id)) : 0;
  const previewPhotos = images
    .filter((image) => image.public_url)
    .map((image) => image.public_url);

  const onTabKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = categories[(activeIndex + dir + categories.length) % categories.length];
    setActiveCategoryId(next.id);
    document.getElementById(`menu-tab-${next.id}`)?.focus();
  };

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-5xl md:text-6xl font-semibold text-dark mb-4 text-balance">
            Our menu
          </h1>
          <p className="text-dark/60 text-lg max-w-xl leading-relaxed">
            Seasonal ingredients and timeless technique. The menu changes with the market.
          </p>
        </div>
      </section>

      {/* Categories + items */}
      <section className="pb-12 md:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {loading && <p className="text-dark/40">Loading menu…</p>}

          {!loading && error && (
            <p role="alert" className="text-red-700">{error}</p>
          )}

          {!loading && !error && categories.length === 0 && (
            <p className="text-dark/40">This menu has not been published yet.</p>
          )}

          {!loading && !error && categories.length > 0 && (
            <>
              <div
                role="tablist"
                aria-label="Menu categories"
                onKeyDown={onTabKeyDown}
                className="sticky top-20 z-30 bg-cream/95 backdrop-blur-sm flex flex-wrap gap-x-6 gap-y-3 mb-8 border-b border-dark/10 pb-4"
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    id={`menu-tab-${cat.id}`}
                    role="tab"
                    aria-selected={active?.id === cat.id}
                    aria-controls={`menu-panel-${cat.id}`}
                    tabIndex={active?.id === cat.id ? 0 : -1}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`pb-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                      active?.id === cat.id
                        ? "text-gold-dark underline underline-offset-8 decoration-1"
                        : "text-dark/50 hover:text-dark"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <motion.div
                key={active?.id}
                role="tabpanel"
                id={`menu-panel-${active?.id}`}
                aria-labelledby={`menu-tab-${active?.id}`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {active && active.items.length === 0 && (
                  <p className="text-dark/40 py-6">
                    No dishes available in this category right now. Please check back soon.
                  </p>
                )}
                <HoverPreview photos={previewPhotos}>
                <ul>
                  {active?.items.map((item, i) => (
                    <Reveal key={item.id} delay={Math.min(i * 0.04, 0.3)}>
                      <li
                        data-photo={previewPhotos.length ? i % previewPhotos.length : undefined}
                        className="py-5 border-b border-dark/10 last:border-b-0"
                      >
                        <div className="flex items-baseline gap-3">
                          <h2 className="font-serif text-2xl font-semibold text-dark">{item.name}</h2>
                          <span aria-hidden="true" className="flex-1 border-b border-dotted border-dark/25 -translate-y-1" />
                          <span className="font-semibold text-gold-dark tabular-nums">{formatPrice(item.price)}</span>
                        </div>
                        {item.description && (
                          <p className="text-dark/50 text-sm mt-1 max-w-md leading-relaxed">{item.description}</p>
                        )}
                      </li>
                    </Reveal>
                  ))}
                </ul>
                </HoverPreview>
              </motion.div>

              <p className="text-dark/40 text-sm mt-8 leading-relaxed">
                Prices include tax. Gratuity is not included. Please tell your server
                about any allergies.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
