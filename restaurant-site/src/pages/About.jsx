import { useTenant } from "../context/TenantContext";
import { useGallery } from "../hooks/useGallery";
import Reveal, { FadeImage } from "../components/Reveal";

const VALUES = [
  {
    title: "Farm to table",
    text: "We partner with local farms and purveyors to ensure every ingredient meets our standards for freshness and quality.",
  },
  {
    title: "Curated experience",
    text: "From the seasonal menu to the hand-selected wine list, every detail is crafted to form one coherent evening.",
  },
  {
    title: "Warm hospitality",
    text: "Fine dining should never feel stiff. Our team makes every guest feel at home from the moment they walk in.",
  },
];

export default function About() {
  const { tenant } = useTenant();
  const { images } = useGallery(tenant.id);
  const storyPhoto =
    images.find((image) => image.public_url)?.public_url ??
    `https://picsum.photos/seed/${tenant.slug}-kitchen/880/660`;

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">Our story</p>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl font-semibold text-dark mb-4 text-balance">
            About us
          </h1>
          <p className="text-dark/60 text-lg max-w-2xl leading-relaxed">
            Born from a love of food, family, and gathering around the table.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.14em] text-dark/55">
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">Locally sourced</span>
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">Seasonal menu</span>
            <span className="rounded-full border border-dark/10 bg-white px-3 py-2">Warm hospitality</span>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="pb-12 md:pb-16 px-4 sm:px-6 lg:px-8">
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
            <h2 className="font-serif text-4xl font-semibold text-dark mb-4 text-balance">{tenant.name}</h2>
            <div className="space-y-4 text-dark/60 text-lg leading-relaxed max-w-lg">
              <p>{tenant.description}</p>
              <p>
                Our philosophy is simple. Source the finest ingredients, treat them
                with respect, and present them in a way that surprises and delights.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tagline band */}
      {tenant.tagline && (
        <section className="bg-pine-deep py-12 md:py-16">
          <Reveal>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-cream leading-[1.15] text-balance">
                {tenant.tagline}
              </p>
            </div>
          </Reveal>
        </section>
      )}

      {/* Values */}
      <section className="pb-12 md:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-4xl font-semibold text-dark mb-4 text-balance">
            What we stand for
          </h2>
          <div className="mt-6 border-t border-dark/10">
            {VALUES.map((v, i) => (
              <Reveal
                key={v.title}
                delay={Math.min(i * 0.08, 0.3)}
                className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-2 sm:gap-6 py-6 border-b border-dark/10"
              >
                <div>
                  <p className="text-xs font-semibold text-gold-dark tabular-nums mb-2">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-serif text-2xl font-semibold text-dark">{v.title}</h3>
                </div>
                <p className="text-dark/60 leading-relaxed max-w-xl">{v.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
