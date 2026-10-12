import { Link } from "react-router-dom";
import {
  FacebookLogo,
  Globe,
  InstagramLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { useTenant } from "../context/TenantContext";

function SocialIcon({ platform }) {
  const name = platform.toLowerCase();
  if (name.includes("instagram")) return <InstagramLogo size={18} aria-hidden="true" />;
  if (name.includes("facebook")) return <FacebookLogo size={18} aria-hidden="true" />;
  if (name === "x" || name.includes("twitter")) return <XLogo size={18} aria-hidden="true" />;
  if (name.includes("tiktok")) return <TiktokLogo size={18} aria-hidden="true" />;
  if (name.includes("youtube")) return <YoutubeLogo size={18} aria-hidden="true" />;
  return <Globe size={18} aria-hidden="true" />;
}

export default function Footer() {
  const { tenant } = useTenant();
  const hours = tenant.hours ?? {};
  const social = tenant.social ?? {};
  const socialLinks = Object.entries(social).filter(
    ([, url]) => typeof url === "string" && url.trim() !== ""
  );

  return (
    <footer className="bg-pine-deep text-cream/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="font-serif text-2xl font-semibold text-cream mb-4">
              {tenant.name}
            </p>
            <p className="text-sm leading-relaxed">{tenant.description}</p>
          </div>

          <div>
            <h2 className="font-serif text-lg font-semibold text-cream mb-4">
              Hours
            </h2>
            <div className="space-y-2">
              {Object.entries(hours).map(([day, time]) => (
                <div key={day} className="flex justify-between gap-8 text-sm">
                  <span>{day}</span>
                  <span className="text-cream/50 tabular-nums">{time}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-lg font-semibold text-cream mb-4">
              Contact
            </h2>
            <div className="space-y-2 text-sm">
              <p>{tenant.address}</p>
              <p>{tenant.phone}</p>
              <p>{tenant.email}</p>
            </div>
            <div className="flex gap-3 mt-5">
              {socialLinks.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${tenant.name} on ${platform}`}
                  className="w-10 h-10 rounded-full border border-cream/25 flex items-center justify-center hover:border-cream hover:text-cream active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <SocialIcon platform={platform} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-cream/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cream/40">
          <p>&copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
          <Link to="/" className="hover:text-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            Site by TableSuite
          </Link>
        </div>
      </div>
    </footer>
  );
}
