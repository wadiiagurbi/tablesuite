import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAdminTenant } from "../../context/AdminTenantContext";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export default function GalleryManager() {
  const { tenant } = useAdminTenant();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const fileInputRef = useRef(null);
  // Bumped whenever the selected tenant changes so a load that is already in
  // flight for the previous tenant can no longer write to state.
  const loadGeneration = useRef(0);

  const load = async () => {
    if (!tenant) return;
    const generation = loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setLoadError(null);
    const { data, error: queryError } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order");
    if (isStale()) return;
    if (queryError) {
      setLoadError("Photos could not be loaded. Please try again.");
      setLoading(false);
      return;
    }
    setImages(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadGeneration.current += 1;
    setImages([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  if (!tenant) {
    return <p className="text-dark/40">Select a restaurant to manage its gallery.</p>;
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Images must be smaller than 8 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    const dot = file.name.lastIndexOf(".");
    const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg" : "jpg";
    const storagePath = `${tenant.id}/${newId()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("gallery").upload(storagePath, file);
    if (uploadError) {
      setError("Upload failed. Please try again.");
      setUploading(false);
      e.target.value = "";
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("gallery").getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from("gallery_images").insert({
      tenant_id: tenant.id,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      caption: "",
      sort_order: images.length,
    });
    if (insertError) {
      // Roll back the orphaned file so storage does not fill with invisible uploads.
      await supabase.storage.from("gallery").remove([storagePath]);
      setError("Photo was uploaded but could not be saved. Please try again.");
      setUploading(false);
      e.target.value = "";
      return;
    }

    setUploading(false);
    e.target.value = "";
    load();
  };

  const setCaptionLocal = (id, caption) => {
    setImages(images.map((img) => (img.id === id ? { ...img, caption } : img)));
  };

  const saveCaption = async (image) => {
    const { error: updateError } = await supabase
      .from("gallery_images")
      .update({ caption: image.caption ?? "" })
      .eq("id", image.id);
    if (updateError) {
      setError("Caption could not be saved. Please try again.");
      load();
    }
  };

  const removeImage = async (image) => {
    if (!confirm("Delete this photo?")) return;
    setError(null);
    const { error: storageError } = await supabase.storage.from("gallery").remove([image.storage_path]);
    if (storageError) {
      setError("The photo file could not be deleted. Please try again.");
      return;
    }
    const { error: dbError } = await supabase.from("gallery_images").delete().eq("id", image.id);
    if (dbError) {
      setError("The photo record could not be deleted. Please try again.");
      return;
    }
    load();
  };

  const persistImageOrder = async (orderedImages) => {
    const results = await Promise.all(orderedImages.map((image, index) =>
      supabase.from("gallery_images")
        .update({ sort_order: index })
        .eq("id", image.id)
        .eq("tenant_id", tenant.id)
    ));
    if (results.some((result) => result.error)) {
      setError("Gallery order could not be saved. Please try again.");
      await load();
      return;
    }
    setImages(orderedImages.map((image, index) => ({ ...image, sort_order: index })));
  };

  const updateSelectedImages = async (patch) => {
    setError(null);
    const results = await Promise.all(selectedImageIds.map((id) =>
      supabase.from("gallery_images")
        .update(patch)
        .eq("id", id)
        .eq("tenant_id", tenant.id)
    ));
    if (results.some((result) => result.error)) {
      setError("Some gallery changes could not be saved. Photos have been refreshed.");
      await load();
      return;
    }
    setSelectedImageIds([]);
    await load();
  };

  const toggleImagePublication = async (image) => {
    setError(null);
    const is_published = !image.is_published;
    const { error: updateError } = await supabase.from("gallery_images")
      .update({ is_published })
      .eq("id", image.id)
      .eq("tenant_id", tenant.id);
    if (updateError) {
      setError("Photo visibility could not be changed. Please try again.");
      return;
    }
    setImages(images.map((entry) => entry.id === image.id ? { ...entry, is_published } : entry));
  };

  const moveImage = async (imageId, direction) => {
    const orderedImages = [...images];
    const index = orderedImages.findIndex((image) => image.id === imageId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedImages.length) return;
    [orderedImages[index], orderedImages[nextIndex]] = [orderedImages[nextIndex], orderedImages[index]];
    await persistImageOrder(orderedImages);
  };

  const moveSelectedToTop = async () => {
    const selected = images.filter((image) => selectedImageIds.includes(image.id));
    const remaining = images.filter((image) => !selectedImageIds.includes(image.id));
    if (selected.length === 0) return;
    await persistImageOrder([...selected, ...remaining]);
    setSelectedImageIds([]);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Editorial workflow</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-dark">Gallery</h1>
      </div>

      <div className="mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-block px-6 py-3 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light cursor-pointer disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          aria-label="Upload photo"
          className="sr-only"
        />
        {error && (
          <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>
        )}
      </div>

      {loading && <p className="text-dark/40">Loading…</p>}
      {loadError && (
        <div className="mb-4">
          <p role="alert" className="text-sm text-red-700 mb-2">{loadError}</p>
          <button onClick={load} className="text-sm text-gold-dark underline underline-offset-4">
            Retry
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-dark/10 py-3">
        <span className="mr-2 text-xs font-medium text-dark/55">{selectedImageIds.length} selected</span>
        <button type="button" onClick={() => setSelectedImageIds(selectedImageIds.length === images.length ? [] : images.map((image) => image.id))} className="text-xs font-semibold text-dark underline underline-offset-4">
          {selectedImageIds.length === images.length && images.length > 0 ? "Clear selection" : "Select all"}
        </button>
        {selectedImageIds.length > 0 && <>
          <button type="button" onClick={() => updateSelectedImages({ is_published: true })} className="rounded-sm border border-dark/15 px-3 py-2 text-xs font-semibold hover:border-gold">Publish selected</button>
          <button type="button" onClick={() => updateSelectedImages({ is_published: false })} className="rounded-sm border border-dark/15 px-3 py-2 text-xs font-semibold hover:border-gold">Unpublish selected</button>
          <button type="button" onClick={moveSelectedToTop} className="rounded-sm bg-dark px-3 py-2 text-xs font-semibold text-white hover:bg-dark-light">Move to top</button>
        </>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <div key={image.id} className={`bg-white rounded-sm shadow-sm overflow-hidden ${image.is_published ? "" : "opacity-65"}`}>
            <img src={image.public_url} alt={image.caption ?? ""} className="w-full aspect-square object-cover" />
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-dark/60">
                  <input
                    type="checkbox"
                    aria-label={`Select photo ${image.caption || image.id}`}
                    checked={selectedImageIds.includes(image.id)}
                    onChange={(event) => setSelectedImageIds(event.target.checked
                      ? [...selectedImageIds, image.id]
                      : selectedImageIds.filter((id) => id !== image.id))}
                  />
                  Select
                </label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-dark/45">
                  {image.is_published ? "Published" : "Unpublished"}
                </span>
              </div>
              <label htmlFor={`caption-${image.id}`} className="sr-only">
                Caption for photo
              </label>
              <input
                id={`caption-${image.id}`}
                value={image.caption ?? ""}
                onChange={(e) => setCaptionLocal(image.id, e.target.value)}
                onBlur={() => saveCaption({ ...image, caption: image.caption ?? "" })}
                placeholder="Caption"
                maxLength={200}
                className="w-full px-3 py-2 border border-dark/20 rounded-sm text-sm"
              />
              <button
                onClick={() => removeImage(image)}
                className="text-xs text-dark/40 hover:text-red-600"
              >
                Delete
              </button>
              <button type="button" onClick={() => toggleImagePublication(image)} className="ml-3 text-xs text-gold-dark">
                {image.is_published ? "Unpublish" : "Publish"}
              </button>
              <span className="float-right flex gap-1">
                <button type="button" aria-label={`Move photo ${image.caption || image.id} up`} disabled={images[0]?.id === image.id} onClick={() => moveImage(image.id, -1)} className="rounded-sm border border-dark/10 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                <button type="button" aria-label={`Move photo ${image.caption || image.id} down`} disabled={images.at(-1)?.id === image.id} onClick={() => moveImage(image.id, 1)} className="rounded-sm border border-dark/10 px-2 py-1 text-xs disabled:opacity-30">↓</button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
