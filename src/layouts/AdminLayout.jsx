import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AdminTenantProvider, useAdminTenant } from "../context/AdminTenantContext";

const navItems = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/settings", label: "Restaurant settings" },
  { to: "/admin/menu", label: "Menu" },
  { to: "/admin/gallery", label: "Gallery" },
  { to: "/admin/reservations", label: "Reservations" },
  { to: "/admin/messages", label: "Messages" },
];

function AdminLayoutInner() {
  const { user, signOut } = useAuth();
  const { tenants, tenant, tenantId, setTenantId, loading, error, refresh } = useAdminTenant();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(null);

  const handleLogout = async () => {
    setLogoutError(null);
    const { error: signOutError } = await signOut();
    if (signOutError) {
      setLogoutError("Logout failed. Please try again.");
      return;
    }
    navigate("/login", { replace: true });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-dark/40">Loading…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <p className="text-dark/70 mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-6 py-3 bg-dark text-cream text-sm font-semibold rounded-sm hover:bg-dark-light transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tenants.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream">
      <aside className="md:w-64 shrink-0 bg-dark text-white/80 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <span className="font-serif text-xl font-bold text-gold">Admin</span>
          <p className="text-xs text-white/40 mt-1 truncate">{user?.email}</p>
        </div>

        {tenants.length > 1 && (
          <div className="p-4 border-b border-white/10">
            <select
              value={tenantId ?? ""}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full bg-dark-light text-white text-sm rounded-sm px-3 py-2 border border-white/10"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-3 text-sm rounded-sm transition-colors ${
                  isActive ? "bg-white/10 text-gold font-medium" : "hover:bg-white/5"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          {tenant && (
            <a
              href={`/site/${tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-white/50 hover:text-gold"
            >
              View your live site ↗
            </a>
          )}
          <button onClick={handleLogout} className="text-xs text-white/50 hover:text-gold">
            Log out
          </button>
          {logoutError && (
            <p role="alert" className="text-xs text-red-400">{logoutError}</p>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-dark/40">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminTenantProvider>
      <AdminLayoutInner />
    </AdminTenantProvider>
  );
}
