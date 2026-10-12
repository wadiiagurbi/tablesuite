import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import SectionHeader from "../components/SectionHeader";
import Reveal, { FadeImage } from "../components/Reveal";
import ScrollChapters from "../components/ScrollChapters";
import SteamCanvas from "../components/SteamCanvas";
import { useTenant } from "../context/TenantContext";
import { useMenu } from "../hooks/useMenu";
import { useGallery } from "../hooks/useGallery";
import { formatPrice } from "../lib/format";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const EXPERIENCE_ITEMS = [
  {
    title: "Seasonal plates",
    text: "Fresh ingredients, small-batch cooking, and a menu that shifts with the market.",
  },
  {
    title: "Warm hospitality",
    text: "Thoughtful service, comfortable pacing, and a room designed for easy conversation.",
  },
  {
    title: "Memorable evenings",
    text: "From date nights to long dinners with friends, the experience feels easy and special.",
  },
];

// Hours keys may be single days ("Sunday") or ranges ("Friday - Saturday").
// Returns today's time string, or undefined when closed / no match.
function todayHours(hours) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayIdx = WEEKDAYS.indexOf(today);
  for (const [key, time] of Object.entries(hours ?? {})) {
    if (key === today) return { day: today, time };
    const range = key.split(" - ").map((d) => d.trim());
    if (range.length === 2) {
      const [start, end] = [WEEKDAYS.indexOf(range[0]), WEEKDAYS.indexOf(range[1])];
      if (start === -1 || end === -1) continue;
      const inRange =
        start <= end
          ? todayIdx >= start && todayIdx <= end
          : todayIdx >= start || todayIdx <= end;
      if (inRange) return { day: today, time };
    }
  }
  return { day: today, time: undefined };
}

// Slow kinetic headline: words rise with a soft blur, once on load.
function HeroName({ name }) {
  const reduce = useReducedMotion();
  const words = name.split(" ");
  if (reduce) {
    return <>{name}</>;
  }
  return (
    <>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block will-change-transform"
          style={{ marginRight: i < words.length - 1 ? "0.24em" : 0 }}
          initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </>
  );
}

export default function Home() {
  const { tenant } = useTenant();
  const { categories, error: menuError } = useMenu(tenant.id);
  const { images } = useGallery(tenant.id);
  const base = `/site/${tenant.slug}`;
  const featured = categories.flatMap((c) => c.items).slice(0, 4);
  const hours = tenant.hours ?? {};
  const tonight = todayHours(hours);
  const heroPhoto =
    images.find((image) => image.public_url)?.public_url ??
    `https://picsum.photos/seed/${tenant.slug}-dining/880/660`;
  const storyPhoto =
    images.filter((image) => image.public_url)[1]?.public_url ??
    heroPhoto;
  const chapterPhotos = [0, 1, 2, 3].map(
    (i) =>
      images.filter((image) => image.public_url)[i]?.public_url ??
      `https://picsum.photos/seed/${tenant.slug}-chapter-${i}/1280/800`
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[100dvh] flex flex-col px-4 sm:px-6 lg:px-10 pt-20">
        <SteamCanvas />
        <div className="relative z-10 max-w-[1600px] mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-12 items-center py-10">
          <div className="animate-rise">
            <h1 className="font-serif text-6xl md:text-8xl font-semibold text-dark leading-[1.02] mb-4 text-balance">
              <HeroName name={tenant.name} />
            </h1>
            <p className="text-xl md:text-2xl text-dark/60 mb-8 font-light max-w-lg leading-relaxed">
              {tenant.tagline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={`${base}/reservations`}
                className="px-8 py-4 bg-dark text-cream font-semibold text-sm hover:bg-dark-light active:scale-[0.98] transition rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              >
                Book a table
              </Link>
              <Link
                to={`${base}/menu`}
                className="px-8 py-4 text-dark font-semibold text-sm underline underline-offset-8 decoration-dark/30 hover:decoration-gold hover:text-gold-dark active:scale-[0.98] transition rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Browse the menu
              </Link>
            </div>
          </div>

          <aside
            aria-label="Visit information"
            className="animate-rise-delayed bg-white border border-dark/10 rounded-sm overflow-hidden"
          >
            <div className="aspect-[16/9] bg-cream-dark">
              <FadeImage
                src={heroPhoto}
                alt=""
                aria-hidden="true"
                eager
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-8 md:p-10">
              <h2 className="font-serif text-2xl font-semibold text-dark mb-4">
                Visit us
              </h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-dark/45 mb-1">Address</dt>
                  <dd className="text-dark font-medium leading-relaxed">{tenant.address}</dd>
                </div>
                <div>
                  <dt className="text-dark/45 mb-1">
                    {tonight.time ? `Open today (${tonight.day})` : "Hours"}
                  </dt>
                  <dd className="text-dark font-medium tabular-nums">
                    {tonight.time ?? "See opening hours below"}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark/45 mb-1">Phone</dt>
                  <dd className="text-dark font-medium">{tenant.phone}</dd>
                </div>
              </dl>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(tenant.address ?? tenant.name)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block text-sm font-semibold text-gold-dark underline underline-offset-4 decoration-gold/40 hover:decoration-gold-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Get directions
              </a>
            </div>
          </aside>
        </div>
        <div className="relative z-10 max-w-[1600px] mx-auto w-full border-t border-dark/15 py-5 flex flex-col sm:flex-row sm:items-center gap-x-10 gap-y-2 text-sm text-dark/60">
          <p className="truncate">{tenant.address}</p>
          <p className="tabular-nums whitespace-nowrap">
            {tonight.time && tonight.time !== "Closed"
              ? `Open today until ${tonight.time.split("-").pop()?.trim() ?? tonight.time}`
              : "See opening hours below"}
          </p>
          <p className="whitespace-nowrap">{tenant.phone}</p>
          <Link
            to={`${base}/menu`}
            className="sm:ml-auto font-semibold text-gold-dark underline underline-offset-4 decoration-gold/40 hover:decoration-gold-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold whitespace-nowrap"
          >
            See tonight&apos;s menu
          </Link>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          <Reveal className="aspect-[4/3] rounded-sm overflow-hidden bg-cream-dark">
            <FadeImage
              src={storyPhoto}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-dark mb-4 text-balance">
              Why we cook
            </h2>
            <p className="text-dark/60 text-lg leading-relaxed mb-6 max-w-lg">{tenant.description}</p>
            <Link
              to={`${base}/about`}
              className="text-sm font-semibold text-gold-dark underline underline-offset-8 decoration-gold/40 hover:decoration-gold-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Read our story
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">What to expect</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl font-semibold text-dark">
              A dining room built for easy nights out.
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {EXPERIENCE_ITEMS.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.08} className="h-full">
                <div className="h-full rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-sm font-semibold text-gold-dark">
                    0{index + 1}
                  </div>
                  <h3 className="font-serif text-3xl font-semibold text-dark">{item.title}</h3>
                  <p className="mt-3 text-dark/65 leading-relaxed">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll chapters: bean to cup */}
      <ScrollChapters photos={chapterPhotos} tenantName={tenant.name} />

      {/* Featured dishes */}
      {menuError ? (
        <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-dark/10">
          <div className="max-w-3xl mx-auto">
            <p role="alert" className="text-red-700">{menuError}</p>
          </div>
        </section>
      ) : (
        featured.length > 0 && (
          <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-dark/10">
            <div className="max-w-3xl mx-auto">
              <SectionHeader title="From our kitchen" subtitle="A few favorites to start with" />
              <ul className="mt-4">
                {featured.map((item, i) => (
                  <Reveal key={item.id} delay={Math.min(i * 0.06, 0.3)}>
                    <li className="py-5 border-b border-dark/10 last:border-b-0">
                      <div className="flex items-baseline gap-3">
                        <h3 className="font-serif text-2xl font-semibold text-dark">{item.name}</h3>
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
            </div>
          </section>
        )
      )}

      {/* Practical info */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          <Reveal className="h-full">
            <div className="h-full rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Find us</p>
              <h2 className="font-serif text-3xl font-semibold text-dark mt-3 mb-4">Visit the room</h2>
              <p className="text-dark/65 text-sm leading-relaxed">
                {tenant.address}
                <br />
                {tenant.phone}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="h-full">
            <div className="h-full rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Opening hours</p>
              <h2 className="font-serif text-3xl font-semibold text-dark mt-3 mb-4">When we&apos;re open</h2>
              <div className="space-y-1.5 text-sm text-dark/65">
                {Object.entries(hours).map(([day, time]) => (
                  <div key={day} className="flex justify-between gap-6 border-b border-dark/10 pb-1.5 last:border-b-0 last:pb-0">
                    <span>{day}</span>
                    <span className="tabular-nums">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.2} className="h-full">
            <div className="h-full rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Good to know</p>
              <h2 className="font-serif text-3xl font-semibold text-dark mt-3 mb-4">Plan your visit</h2>
              <p className="text-dark/65 text-sm leading-relaxed">
                Menus change with the seasons. For parties of 9 or more, please call us
                directly and we will arrange the table.
              </p>
              <Link
                to={`${base}/reservations`}
                className="mt-5 inline-flex items-center text-sm font-semibold text-gold-dark underline underline-offset-4 decoration-gold/40 hover:decoration-gold-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                Reserve a table
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
