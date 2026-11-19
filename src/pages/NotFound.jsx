import { Link } from "react-router-dom";

export default function NotFound({ backTo = "/", backLabel = "Go home" }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="font-serif text-7xl font-semibold text-dark/20 mb-4" aria-hidden="true">
        404
      </p>
      <h1 className="font-serif text-3xl font-semibold text-dark mb-2">Page not found</h1>
      <p className="text-dark/50 mb-8 max-w-md">
        This address does not exist or is no longer available.
      </p>
      <Link
        to={backTo}
        className="px-8 py-3 bg-dark text-cream text-sm font-semibold rounded-sm hover:bg-dark-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {backLabel}
      </Link>
    </div>
  );
}
