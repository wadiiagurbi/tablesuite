import { useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

// Skiper-style image reveal: hovering a tagged row floats a photo preview
// that follows the cursor with spring physics. Decorative only — all content
// stays fully readable without hover. Desktop pointers only; touch and
// reduced-motion users get the plain list. Tag rows with data-photo={index}.
export default function HoverPreview({ photos, children, className }) {
  const reduce = useReducedMotion();
  const [finePointer] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
  );
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 30 });
  const springY = useSpring(y, { stiffness: 260, damping: 30 });

  if (!finePointer || reduce || photos.length === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={className}
      onMouseMove={(e) => {
        x.set(e.clientX + 28);
        y.set(e.clientY - 130);
      }}
      onMouseOver={(e) => {
        const row = e.target.closest?.("[data-photo]");
        if (row) {
          setIndex(Number(row.dataset.photo) % photos.length);
          setHovering(true);
        }
      }}
      onMouseLeave={() => setHovering(false)}
    >
      {children}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-40"
        style={{ x: springX, y: springY }}
        initial={false}
        animate={{ opacity: hovering ? 1 : 0, scale: hovering ? 1 : 0.9 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={photos[index]}
          alt=""
          className="w-60 aspect-[4/3] object-cover rounded-sm shadow-[0_8px_30px_rgba(28,24,20,0.35)]"
        />
      </motion.div>
      {/* Warm the cache so first hover reveals instantly. */}
      <div className="hidden" aria-hidden="true">
        {photos.map((src) => (
          <img key={src} src={src} alt="" loading="eager" />
        ))}
      </div>
    </div>
  );
}
