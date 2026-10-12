import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-sm shadow-sm">
        <h1 className="font-serif text-3xl font-bold text-dark mb-2 text-center">Log in</h1>
        <p className="text-dark/50 text-sm text-center mb-8">Manage your restaurant's site</p>

        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="mb-4 text-center text-sm text-red-700 focus:outline-none">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-dark mb-2">Email</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-dark/20 rounded-sm focus:outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold bg-cream/50"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-dark mb-2">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-dark/20 rounded-sm focus:outline-none focus:border-gold focus-visible:ring-2 focus-visible:ring-gold bg-cream/50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-dark text-white font-semibold text-sm hover:bg-dark-light transition-colors rounded-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-dark/50 mt-8">
          Don't have a restaurant yet?{" "}
          <Link to="/signup" className="text-gold-dark font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
