import { Component, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "@phosphor-icons/react";
import Reveal, { FadeImage } from "../../components/Reveal";

const PizzaScene = lazy(() => import("../../components/PizzaScene"));

// WebGL is not guaranteed (privacy browsers, old GPUs, disabled hardware
// acceleration). If the 3D scene throws, fall back to the photo hero instead
// of letting the page-level error boundary take down the whole landing page.
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

const HERO_PRIMARY =
  "https://live.staticflickr.com/8326/8107500946_d50d2a3010.jpg";

const DEMOS = [
  {
    slug: "golden-fork",
    name: "The Golden Fork",
    kind: "Fine dining, downtown NY",
    description:
      "Contemporary cooking, a seasonal tasting menu, and table requests handled on the site.",
    photo: "https://live.staticflickr.com/971/40276940110_7dcfb18064_b.jpg",
    photoAlt: "Restaurant dining room set with tables before service",
    wide: true,
  },
  {
    slug: "ember-oak",
    name: "Ember & Oak",
    kind: "Wood-fired pizza, Portland",
    description:
      "One oak-burning oven, a short menu of pies, natural wine, and late tables on weekends.",
    photo: "https://live.staticflickr.com/3896/15001475025_08322a7270_b.jpg",
    photoAlt: "Wood fired oven burning inside a pizzeria",
    wide: false,
  },
];

const FEATURES = [
  {
    numeral: "01",
    title: "Online reservations",
    text: "Guests request a table from your site. Each request lands in one inbox with their notes.",
  },
  {
    numeral: "02",
    title: "Menu manager",
    text: "Add dishes, change prices, mark an item sold out. The site updates the moment you save.",
  },
  {
    numeral: "03",
    title: "Gallery & inbox",
    text: "Upload new photos and read contact messages in the same place, so nothing gets missed.",
  },
];

const TRUST_ITEMS = [
  "Live reservations",
  "Menu updates in seconds",
  "Built for independent restaurants",
];

const TESTIMONIALS = [
  {
    quote: "The new site finally feels like the restaurant itself. Guests book faster and the whole experience feels more premium.",
    name: "Mila Chen",
    role: "Owner, Ember & Oak",
  },
  {
    quote: "We changed the menu on the fly and guests saw it immediately. It removed a lot of friction from our day-to-day.",
    name: "Daniel Ross",
    role: "General manager, The Golden Fork",
  },
  {
    quote: "The booking flow is simple and the admin inbox keeps our reservations easy to manage without extra tools.",
    name: "Priya Nair",
    role: "Host, Cedar & Vine",
  },
];

const PRIMARY_LINK =
  "inline-flex items-center justify-center rounded-sm bg-gold px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-gold-light active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

const SECONDARY_LINK =
  "inline-flex items-center justify-center rounded-sm border border-dark/25 px-8 py-4 text-sm font-semibold text-dark transition-colors hover:border-gold hover:text-gold-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

export default function LandingPage() {
  return (
    <div>
      <nav
        aria-label="Primary"
        className="fixed top-0 left-0 right-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-dark/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <span className="font-serif text-2xl font-semibold text-dark tracking-wide">TableSuite</span>
          <div className="flex items-center">
            <Link
              to="/login"
              className="text-sm text-dark/70 hover:text-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero: copy left, photo collage right, sized to the viewport */}
      <section className="min-h-[100dvh] flex items-center px-4 sm:px-6 lg:px-8 pt-24 pb-10">
        <div className="mx-auto w-full max-w-7xl grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <p className="animate-rise text-sm font-semibold text-gold tracking-wide">
              For independent restaurants
            </p>
            <h1 className="animate-rise mt-4 font-serif text-[2.6rem] sm:text-6xl lg:text-7xl font-semibold text-dark leading-[1.05] text-balance">
              Get your restaurant its own website
            </h1>
            <p className="animate-rise-delayed mt-5 max-w-lg text-lg text-dark/65 font-light leading-relaxed">
              We build your menu, gallery, and reservations on your own address.
              You edit the details yourself after that.
            </p>
            <div className="animate-rise-delayed mt-7 flex flex-wrap items-center gap-3">
              <a href="#demos" className={PRIMARY_LINK}>
                See live demos
              </a>
              <Link to="/signup" className={SECONDARY_LINK}>
                Start free
              </Link>
            </div>

            <div className="animate-rise-delayed mt-8 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.18em] text-dark/55">
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="rounded-full border border-dark/10 bg-white/60 px-3 py-2 shadow-[0_8px_24px_rgba(28,24,20,0.04)] backdrop-blur-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -top-4 right-10 h-px w-20 bg-gold/70 z-10"
            />
            <div className="relative h-[17rem] sm:h-[23rem] lg:h-[min(68vh,30rem)] w-full">
              <SceneBoundary
                fallback={
                  <FadeImage
                    src={HERO_PRIMARY}
                    alt="Margherita pizza with a blistered crust and basil"
                    eager
                    className="size-full object-cover rounded-sm"
                  />
                }
              >
                <Suspense
                  fallback={
                    <FadeImage
                      src={HERO_PRIMARY}
                      alt="Margherita pizza with a blistered crust and basil"
                      eager
                      className="size-full object-cover rounded-sm"
                    />
                  }
                >
                  <PizzaScene />
                </Suspense>
              </SceneBoundary>
            </div>
          </div>
        </div>
      </section>

      {/* Live demos: one wide card, one narrow card pulled up and overlapping */}
      <section id="demos" className="scroll-mt-24 px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal y={16} className="max-w-2xl mb-8 sm:mb-12">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-dark text-balance">
              Two live sites to look at
            </h2>
            <p className="mt-4 text-lg text-dark/60 leading-relaxed">
              Both run on TableSuite today. Menus, hours, and reservations all work.
            </p>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-12 lg:gap-8">
            {DEMOS.map((demo, i) => (
              <Reveal
                key={demo.slug}
                y={24}
                delay={i * 0.08}
                className={
                  demo.wide
                    ? "lg:col-span-7"
                    : "lg:col-span-5 lg:-ml-10 lg:-mt-20 relative z-10"
                }
              >
                <article className="group flex h-full flex-col">
                  <div
                    className={`overflow-hidden rounded-sm bg-cream-dark ${
                      demo.wide ? "aspect-[16/10] lg:aspect-[3/2]" : "aspect-[4/3] lg:aspect-[4/5]"
                    }`}
                  >
                    <FadeImage
                      src={demo.photo}
                      alt={demo.photoAlt}
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-4 flex flex-1 flex-col">
                    <p className="text-sm text-dark/55">{demo.kind}</p>
                    <h3 className="mt-2 font-serif text-3xl md:text-4xl font-semibold text-dark">
                      {demo.name}
                    </h3>
                    <p className="mt-3 max-w-[30rem] text-dark/65 leading-relaxed">
                      {demo.description}
                    </p>
                    <Link
                      to={`/site/${demo.slug}`}
                      className="mt-auto pt-5 inline-flex items-center gap-2 self-start text-sm font-semibold text-dark underline underline-offset-8 decoration-dark/30 transition-colors hover:text-gold-dark hover:decoration-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-cream rounded-sm"
                    >
                      Visit demo site
                      <ArrowUpRight
                        size={16}
                        weight="bold"
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">Why operators switch</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl font-semibold text-dark text-balance">
              One polished restaurant site, without the extra stack.
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Fast guest booking",
                text: "A cleaner reservation flow keeps tables moving and reduces missed requests.",
                accent: "bg-gold/10",
              },
              {
                title: "Simple menu control",
                text: "Update pricing and menu copy in minutes, from one admin workspace.",
                accent: "bg-cream-dark",
              },
              {
                title: "Brand that feels premium",
                text: "A refined layout gives each restaurant enough personality to stand out online.",
                accent: "bg-[#f4efe8]",
              },
            ].map((item) => (
              <Reveal key={item.title} y={18} className="h-full">
                <div className={`h-full rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)] ${item.accent}`}>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-dark text-sm font-semibold text-cream">
                    {item.title.charAt(0)}
                  </div>
                  <h3 className="font-serif text-3xl font-semibold text-dark">{item.title}</h3>
                  <p className="mt-3 text-dark/65 leading-relaxed">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">Guest feedback</p>
            <h2 className="mt-3 font-serif text-4xl md:text-5xl font-semibold text-dark text-balance">
              The kind of experience guests remember.
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((entry) => (
              <Reveal key={entry.name} y={18} className="h-full">
                <div className="h-full rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
                  <div className="mb-4 text-gold-dark text-lg" aria-label="Five star review">
                    ★★★★★
                  </div>
                  <p className="text-dark/70 leading-relaxed">“{entry.quote}”</p>
                  <div className="mt-6 border-t border-dark/10 pt-4">
                    <p className="font-semibold text-dark">{entry.name}</p>
                    <p className="text-sm text-dark/50">{entry.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features: divided rows with numerals, no cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <div className="mx-auto w-full max-w-5xl">
          <Reveal y={16} className="max-w-2xl mb-8 sm:mb-10">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-dark text-balance">
              What your guests can do
            </h2>
          </Reveal>

          <div className="border-t border-dark/15">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.numeral} y={18} delay={i * 0.06}>
                <div className="grid gap-2 sm:grid-cols-[4.5rem_14rem_1fr] sm:gap-6 items-baseline py-6 border-b border-dark/15">
                  <span className="font-serif text-lg text-gold" aria-hidden="true">
                    {feature.numeral}
                  </span>
                  <h3 className="font-serif text-2xl font-semibold text-dark">
                    {feature.title}
                  </h3>
                  <p className="max-w-md text-dark/65 leading-relaxed">{feature.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="bg-pine-deep px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <Reveal className="mx-auto w-full max-w-3xl text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-cream text-balance">
            Open your restaurant&apos;s site this week.
          </h2>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center justify-center rounded-sm bg-cream px-8 py-4 text-sm font-semibold text-dark transition-colors hover:bg-cream-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-deep"
          >
            Start free
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
