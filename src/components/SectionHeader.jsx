import Reveal from "./Reveal";

export default function SectionHeader({ title, subtitle }) {
  return (
    <Reveal y={16} className="text-center mb-8">
      <h2 className="font-serif text-4xl md:text-5xl font-semibold text-dark mb-4 text-balance">
        {title}
      </h2>
      <div className="w-16 h-px bg-gold mx-auto mb-4" aria-hidden="true" />
      {subtitle && (
        <p className="text-dark/60 text-lg max-w-xl mx-auto">{subtitle}</p>
      )}
    </Reveal>
  );
}
