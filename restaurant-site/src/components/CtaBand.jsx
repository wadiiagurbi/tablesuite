import { Link } from "react-router-dom";
import Reveal from "./Reveal";

// Full-bleed closing call to action, rendered by TenantLayout between the
// page content and the footer so every tenant page ends on one invitation.
export default function CtaBand({ slug }) {
  return (
    <section className="bg-pine-deep py-14 px-4 sm:px-6 lg:px-8">
      <Reveal>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-cream text-balance">
            Hungry already?
          </h2>
          <Link
            to={`/site/${slug}/reservations`}
            className="mt-8 inline-block px-8 py-4 bg-cream text-dark font-semibold text-sm hover:bg-cream-dark active:scale-[0.98] transition rounded-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pine-deep"
          >
            Book a table
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
