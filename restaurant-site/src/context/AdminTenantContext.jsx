/* eslint-disable react/only-export-components, react/set-state-in-effect */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const AdminTenantContext = createContext(null);

// Tenant ids are UUID strings; anything that is not a usable id must never match.
function normalizeTenantId(value) {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value.trim() : value;
}

export function normalizeTenantAccess(rows = []) {
  const allowedRoles = new Set(["owner", "staff"]);

  return (rows ?? [])
    .filter((row) => row?.tenants && allowedRoles.has(row?.role))
    .map((row) => row.tenants)
    .filter(Boolean)
    .map(({ id, name, slug, ...rest }) => ({ id, name, slug, ...rest }));
}

export function AdminTenantProvider({ children }) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setTenants([]);
      setTenantId(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("tenant_admins")
      .select("tenant_id, role, tenants(*)")
      .eq("user_id", user.id);

    if (queryError) {
      setTenants([]);
      setError("Your restaurants could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    const owned = normalizeTenantAccess(data ?? []);
    setTenants(owned);
    setTenantId((current) => current ?? owned[0]?.id ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Normalize both sides once and compare strictly: a null/undefined selection
  // resolves to no tenant instead of coercing onto a row.
  const selectedId = normalizeTenantId(tenantId);
  const tenant = tenants.find((t) => {
    const id = normalizeTenantId(t.id);
    return id !== null && id === selectedId;
  }) ?? null;

  return (
    <AdminTenantContext.Provider
      value={{ tenants, tenant, tenantId, setTenantId, loading, error, refresh }}
    >
      {children}
    </AdminTenantContext.Provider>
  );
}

export function useAdminTenant() {
  const ctx = useContext(AdminTenantContext);
  if (!ctx) throw new Error("useAdminTenant must be used within AdminTenantProvider");
  return ctx;
}
