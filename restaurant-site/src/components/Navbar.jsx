/* eslint-disable react/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { List, X } from "@phosphor-icons/react";
import { useTenant } from "../context/TenantContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { tenant } = useTenant();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closeMenu = () => setOpen(false);

  const base = `/site/${tenant.slug}`;
  const navLinks = [
    { path: `${base}/menu`, label: "Menu" },
    { path: `${base}/about`, label: "About" },
    { path: `${base}/gallery`, label: "Gallery" },
    { path: `${base}/contact`, label: "Contact" },
  ];

  return (
    <nav aria-label="Restaurant navigation" className="fixed inset-x-0 top-0 z-50 border-b border-dark/10 bg-cream/95 shadow-[0_4px_18px_rgba(28,24,20,0.04)] backdrop-blur-md">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex h-[72px] items-center justify-between gap-6">
          <Link
            to={base}
            onClick={closeMenu}
            className="max-w-[42vw] shrink-0 truncate font-serif text-[1.35rem] font-semibold text-dark sm:max-w-[260px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {tenant.name}
          </Link>

          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                aria-current={location.pathname === link.path ? "page" : undefined}
                className={`relative whitespace-nowrap py-2 text-[13px] font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-gold after:transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  location.pathname === link.path
                    ? "text-dark after:scale-x-100"
                    : "text-dark/60 after:scale-x-0 hover:text-dark hover:after:scale-x-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={`${base}/reservations`}
              className="ml-2 whitespace-nowrap rounded-sm bg-pine px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-pine-deep active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              Reserve
            </Link>
          </div>

          <button
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="tenant-mobile-nav"
            className="rounded-sm p-2 text-dark/70 transition-colors hover:bg-dark/5 hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={22} aria-hidden="true" /> : <List size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="tenant-mobile-nav"
            className="overflow-hidden border-t border-dark/10 bg-cream lg:hidden"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto max-w-[1440px] px-5 pb-5 pt-2 sm:px-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeMenu}
                  aria-current={location.pathname === link.path ? "page" : undefined}
                  className={`flex min-h-12 items-center border-b border-dark/10 px-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                    location.pathname === link.path
                      ? "font-semibold text-gold-dark"
                      : "text-dark/70 hover:text-dark"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to={`${base}/reservations`}
                onClick={closeMenu}
                className="mt-4 flex min-h-12 items-center justify-center rounded-sm bg-pine px-4 text-sm font-semibold text-cream transition-colors hover:bg-pine-deep active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Reserve a table
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
