/* eslint-disable react/set-state-in-effect */
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useGallery(tenantId) {
  const [images, setImages] = useState([]);
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
      .from("gallery_images")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .order("sort_order")
      .abortSignal(signal)
      .then(({ data, error: queryError }) => {
        if (signal.aborted) return;
        if (queryError) {
          setError("The gallery could not be loaded. Please try again.");
          setLoading(false);
          return;
        }
        setImages(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (signal.aborted) return;
        setError("The gallery could not be loaded. Please check your connection and try again.");
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [tenantId]);

  return { images, loading, error };
}
