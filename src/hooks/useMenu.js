/* eslint-disable react/set-state-in-effect */
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useMenu(tenantId) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError(null);

    supabase
      .from("menu_categories")
      .select("id, name, sort_order, menu_items(id, name, description, price, is_available, sort_order)")
      .eq("tenant_id", tenantId)
      .order("sort_order")
      .order("sort_order", { foreignTable: "menu_items" })
      .abortSignal(signal)
      .then(({ data, error: queryError }) => {
        if (signal.aborted) return;
        if (queryError) {
          setError("The menu could not be loaded. Please try again.");
          setLoading(false);
          return;
        }
        const withAvailableItems = (data ?? []).map((cat) => ({
          ...cat,
          items: (cat.menu_items ?? []).filter((item) => item.is_available),
        }));
        setCategories(withAvailableItems);
        setLoading(false);
      })
      .catch(() => {
        if (signal.aborted) return;
        setError("The menu could not be loaded. Please check your connection and try again.");
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [tenantId]);

  return { categories, loading, error };
}
