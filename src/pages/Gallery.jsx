import { useCallback, useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useTenant } from "../context/TenantContext";
import { useGallery } from "../hooks/useGallery";
import Reveal, { FadeImage } from "../components/Reveal";

const EASE = [0.22, 1, 0.36, 1];

export default function Gallery() {
  const { tenant } = useTenant();
  const { images, loading, error } = useGallery(tenant.id);
  const [broken, setBroken] = useState({});
  const [openIndex, setOpenIndex] = useState(null);
  const closeButtonRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const reduce = useReducedMotion();

  const visible = images.filter((image) => image.public_url && !broken[image.id]);
  const count = visible.length;
  const current = openIndex === null ? null : (visible[openIndex] ?? null);
  // Keyed off the resolved image so a photo that disappears mid-view can never
  // leave an empty dialog, a stuck scroll lock, or a stranded key handler.
  const lightboxOpen = current !== null;
  const captionId = current ? `gallery-caption-${current.id}` : null;
  const captionText = current
    ? current.caption || `Photo ${openIndex + 1} from ${tenant.name}`
    : "";

  const openLightbox = (index, trigger) => {
    lastTriggerRef.current = trigger;
    setOpenIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setOpenIndex(null);
    const trigger = lastTriggerRef.current;
    lastTriggerRef.current = null;
    trigger?.focus();
  }, []);

  // Focus lands on the close button whenever the lightbox opens (and only
  // then, so prev/next never steal focus back from the button being pressed).
  useEffect(() => {
    if (lightboxOpen) closeButtonRef.current?.focus();
  }, [lightboxOpen]);

  // Escape closes, arrows step through the set.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
      } else if (count > 1 && e.key === "ArrowRight") {
        e.preventDefault();
        setOpenIndex((i) => ((i ?? 0) + 1) % count);
      } else if (count > 1 && e.key === "ArrowLeft") {
        e.preventDefault();
        setOpenIndex((i) => ((i ?? 0) - 1 + count) % count);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, count, closeLightbox]);

  // Lock the page behind the scrim, padding out the scrollbar so the artwork
  // under the overlay does not shift sideways on open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [lightboxOpen]);

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">Photo journal</p>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl font-semibold text-dark mb-4 text-balance">
            Gallery
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-dark/60">
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">{count} photos</span>
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">Kitchen & room details</span>
          </div>
          <p className="mt-5 text-dark/60 text-lg max-w-2xl leading-relaxed">
            Photos from the dining room and kitchen at {tenant.name}.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-12 md:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {loading && <p className="text-dark/40">Loading gallery…</p>}

          {!loading && error && (
            <p role="alert" className="text-red-700">{error}</p>
          )}

          {!loading && !error && visible.length === 0 && (
            <p className="text-dark/40">No photos have been added yet.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((image, i) => (
              <Reveal
                key={image.id}
                delay={Math.min(i * 0.05, 0.4)}
                className={`relative aspect-square bg-cream-dark rounded-sm overflow-hidden group ${
                  i % 5 === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                }`}
              >
                <figure
                  role="button"
                  tabIndex={0}
                  aria-label={image.caption || `Photo ${i + 1} from ${tenant.name}`}
                  onClick={(e) => openLightbox(i, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLightbox(i, e.currentTarget);
                    }
                  }}
                  className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
                >
                  <FadeImage
                    src={image.public_url}
                    alt={image.caption || `Photo ${i + 1} from ${tenant.name}`}
                    eager={i === 0}
                    onError={() => setBroken((prev) => ({ ...prev, [image.id]: true }))}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {image.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-dark/80 to-transparent px-5 pt-10 pb-4">
                      <p className="text-cream font-serif text-lg leading-snug">{image.caption}</p>
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            ))}
          </div>

          <p className="text-dark/40 text-xs mt-8 leading-relaxed">
            Food photography via Flickr, Creative Commons. Full per-photo credits
            available on request.
          </p>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={captionId}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="fixed inset-0 z-[60] bg-dark flex flex-col"
        >
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-cream/50 text-xs tabular-nums">
              {openIndex + 1} / {count}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              aria-label="Close photo viewer"
              className="p-2 -mr-2 text-cream/70 hover:text-cream transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="relative w-full max-w-5xl"
            >
              <FadeImage
                key={current.id}
                src={current.public_url}
                alt={captionText}
                eager
                className="w-full max-h-[68vh] object-contain"
              />

              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenIndex((openIndex - 1 + count) % count)}
                    aria-label="Previous photo"
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-3 -ml-2 text-cream/70 hover:text-cream transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <CaretLeft size={26} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenIndex((openIndex + 1) % count)}
                    aria-label="Next photo"
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-3 -mr-2 text-cream/70 hover:text-cream transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <CaretRight size={26} aria-hidden="true" />
                  </button>
                </>
              )}
            </motion.div>
          </div>

          <p
            id={captionId}
            className="px-4 sm:px-6 lg:px-8 py-6 pb-10 text-center font-serif text-xl md:text-2xl text-cream leading-snug max-w-3xl mx-auto text-balance"
          >
            {captionText}
          </p>
        </motion.div>
      )}
    </div>
  );
}
