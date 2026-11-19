import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll, useMotionValueEvent } from "motion/react";

// Ora-style scroll chapter: a pinned canvas crossfades through the tenant's
// own gallery photos as you scroll (Ken Burns drift included). Scroll progress
// drives rendering directly via Motion's useScroll — no animation library
// timelines, no scroll listeners. Preloader counts REAL decoded frames.
// Reduced motion (or no photos): falls back to a static stacked layout.
const CHAPTERS = [
  { title: "The roast", text: "Beans roasted until the room smells like morning." },
  { title: "The brew", text: "Slow water, patient hands, no shortcuts." },
  { title: "The pour", text: "Finished at the table, served while it steams." },
  { title: "The table", text: "Yours, whenever you are ready." },
];

function drawCover(ctx, img, w, h, scale, alpha) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih) * scale;
  const dw = iw * s;
  const dh = ih * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.globalAlpha = 1;
}

export default function ScrollChapters({ photos, tenantName }) {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [active, setActive] = useState(0);

  const slots = CHAPTERS.map((chapter, i) => ({
    ...chapter,
    src: photos[i] ?? null,
  }));

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  const render = (progress) => {
    const canvas = canvasRef.current;
    const frames = framesRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.fillStyle = "#1c1814";
    ctx.fillRect(0, 0, w, h);
    const n = frames.length;
    const pos = Math.min(Math.max(progress, 0), 1) * (n - 1);
    const idx = Math.floor(pos);
    const blend = pos - idx;
    const drift = 1 + pos * 0.02;
    drawCover(ctx, frames[idx], w, h, drift, 1);
    if (blend > 0 && frames[idx + 1]) {
      drawCover(ctx, frames[idx + 1], w, h, drift, blend);
    }
  };

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive((prev) => {
      const next = Math.min(slots.length - 1, Math.floor(v * slots.length));
      return next === prev ? prev : next;
    });
    render(v);
  });

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    const loaders = slots.map((slot) => {
      const img = new Image();
      img.decoding = "async";
      img.src = slot.src;
      return img;
    });
    let done = 0;
    const onOne = () => {
      done += 1;
      if (cancelled) return;
      setLoadProgress(done / loaders.length);
      if (done === loaders.length) {
        framesRef.current = loaders;
        // Redraw first frame once every image has decoded.
        requestAnimationFrame(() => {
          if (!cancelled) {
            render(0);
            setReady(true);
          }
        });
      }
    };
    loaders.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) onOne();
      else {
        img.onload = onOne;
        img.onerror = onOne;
      }
    });
    const onResize = () => render(scrollYProgress.get());
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, slots.map((s) => s.src).join("|")]);

  // Reduced motion or nothing to show: static stacked chapters.
  if (reduce || slots.every((s) => !s.src)) {
    return (
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-pine-deep">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-cream mb-12 text-balance">
            From bean to cup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {slots.filter((s) => s.src).map((slot) => (
              <figure key={slot.title} className="rounded-sm overflow-hidden bg-pine">
                <div className="aspect-[16/10]">
                  <img src={slot.src} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                </div>
                <figcaption className="p-6">
                  <p className="font-serif text-2xl text-cream mb-1">{slot.title}</p>
                  <p className="text-cream/70 text-sm">{slot.text}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={wrapRef} className="relative h-[320vh] bg-pine-deep">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
        <div className="absolute inset-0 bg-dark/30" aria-hidden="true" />

        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-pine-deep">
            <p className="font-serif text-2xl text-cream">Setting the table…</p>
            <div className="w-48 h-px bg-cream/20">
              <div
                className="h-full bg-gold transition-[width] duration-300"
                style={{ width: `${Math.round(loadProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div
          className={`absolute inset-0 flex flex-col justify-end pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="max-w-7xl mx-auto w-full">
            <p className="text-cream/60 text-sm mb-3 tabular-nums" aria-hidden="true">
              {String(active + 1).padStart(2, "0")} / {String(slots.length).padStart(2, "0")}
            </p>
            <h2 className="font-serif text-5xl md:text-7xl font-semibold text-cream mb-4 text-balance">
              {slots[active].title}
            </h2>
            <p className="text-cream/70 text-lg max-w-xl leading-relaxed">{slots[active].text}</p>
            <div className="flex gap-2 mt-8" aria-hidden="true">
              {slots.map((slot, i) => (
                <span
                  key={slot.title}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === active ? "w-10 bg-gold" : "w-4 bg-cream/30"
                  }`}
                />
              ))}
            </div>
            <p className="sr-only" role="status">
              {slots[active].title} at {tenantName}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
