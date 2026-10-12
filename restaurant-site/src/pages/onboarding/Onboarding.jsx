import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const slug = slugify(name);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-dark/40">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("create_tenant_for_user", {
      tenant_name: name,
      tenant_slug: slug,
    });

    setSubmitting(false);
    if (rpcError) {
      // 23505 = slug taken (unique violation, incl. the per-user tenant index).
      // Never surface raw DB text: it leaks internals and reads poorly.
      setError(
        rpcError.code === "23505" || (rpcError.message ?? "").includes("already taken")
          ? "That name is already taken. Try something more specific."
          : "Your site could not be created. Please try again."
      );
      return;
    }
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-lg bg-white p-8 md:p-12 rounded-sm shadow-sm">
        <h1 className="font-serif text-3xl font-bold text-dark mb-2 text-center">
          Name your restaurant
        </h1>
        <p className="text-dark/50 text-sm text-center mb-8">
          You can change everything else — hours, menu, photos — from your dashboard.
        </p>

        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="mb-4 text-center text-sm text-red-700 focus:outline-none">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="onboarding-name" className="block text-sm font-medium text-dark mb-2">Restaurant name</label>
            <input
              id="onboarding-name"
              type="text"
              required
              maxLength={120}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-dark/20 rounded-sm focus:outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold bg-cream/50"
              placeholder="The Golden Fork"
            />
            {slug && (
              <p className="text-xs text-dark/40 mt-2">
                Your site will be at <span className="font-mono">/site/{slug}</span>
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !slug}
            className="w-full py-4 bg-gold text-dark font-semibold text-sm hover:bg-gold-light transition-colors rounded-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {submitting ? "Creating your site…" : "Create my site"}
          </button>
        </form>
      </div>
    </div>
  );
}
