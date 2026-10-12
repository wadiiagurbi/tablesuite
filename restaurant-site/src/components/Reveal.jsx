import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// Shared scroll-reveal wrapper: slow "unhurried" entrance, transform/opacity
// only, collapses to a plain div under prefers-reduced-motion.
const EASE = [0.22, 1, 0.36, 1];

export default function Reveal({ children, delay = 0, y = 28, className }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// Image with a soft opacity fade-in on load (prevents jarring pop-in).
// Pass through loading/decoding/onError/aria props as needed.
export function FadeImage({ src, alt, className, eager, onError, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={onError}
      onLoad={() => setLoaded(true)}
      className={`${className ?? ""} transition-opacity duration-300 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
      {...rest}
    />
  );
}
