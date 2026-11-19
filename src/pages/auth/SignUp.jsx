import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error: signUpError } = await signUp(email, password);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setNeedsConfirmation(true);
      return;
    }
    navigate("/onboarding");
  };

  if (needsConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-sm shadow-sm text-center">
          <h1 className="font-serif text-2xl font-bold text-dark mb-2">Check your email</h1>
          <p className="text-dark/60 text-sm">
            We've sent a confirmation link to {email}. Confirm your address, then log in to set up your restaurant.
          </p>
          <Link to="/login" className="inline-block mt-6 text-gold-dark font-medium text-sm">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-sm shadow-sm">
        <h1 className="font-serif text-3xl font-bold text-dark mb-2 text-center">Create your account</h1>
        <p className="text-dark/50 text-sm text-center mb-8">Start building your restaurant's site</p>

        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="mb-4 text-center text-sm text-red-700 focus:outline-none">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-dark mb-2">Email</label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-dark/20 rounded-sm focus:outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold bg-cream/50"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-dark mb-2">Password</label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-dark/20 rounded-sm focus:outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold bg-cream/50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gold text-dark font-semibold text-sm hover:bg-gold-light transition-colors rounded-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-dark/50 mt-8">
          Already have an account?{" "}
          <Link to="/login" className="text-gold-dark font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
