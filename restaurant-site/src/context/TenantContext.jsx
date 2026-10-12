/* eslint-disable react/only-export-components, react/set-state-in-effect */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { slug } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (fetchError) {
      setError(fetchError);
      setTenant(null);
    } else if (data?.slug !== slug || data?.status !== "active") {
      // Defensive re-check: the row is only usable when it is the requested slug
      // and is still active, so no tenant-scoped query ever runs against a
      // mismatched or deactivated tenant.
      setTenant(null);
      setError(new Error("Tenant not found"));
    } else {
      setError(null);
      setTenant(data);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
