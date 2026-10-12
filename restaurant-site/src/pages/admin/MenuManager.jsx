import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAdminTenant } from "../../context/AdminTenantContext";
import { formatPrice } from "../../lib/format";

const emptyItem = { name: "", description: "", price: "", is_featured: false };

export default function MenuManager() {
  const { tenant } = useAdminTenant();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemByCategory, setNewItemByCategory] = useState({});
  const [formError, setFormError] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  // Bumped whenever the selected tenant changes so a load that is already in
  // flight for the previous tenant can no longer write to state.
  const loadGeneration = useRef(0);

  const load = async () => {
    if (!tenant) return;
    const generation = loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("menu_categories")
      .select("id, name, sort_order, menu_items(id, name, description, price, is_available, is_featured, sort_order)")
      .eq("tenant_id", tenant.id)
      .order("sort_order")
      .order("sort_order", { foreignTable: "menu_items" });
    if (isStale()) return;
    if (error) {
      setLoadError("The menu could not be loaded. Please try again.");
      setLoading(false);
      return;
    }
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadGeneration.current += 1;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  if (!tenant) {
    return <p className="text-dark/40">Select a restaurant to manage its menu.</p>;
  }

  const addCategory = async (e) => {
    e.preventDefault();
    setFormError(null);
    const name = newCategoryName.trim();
    if (!name) return;
    const { error } = await supabase.from("menu_categories").insert({
      tenant_id: tenant.id,
      name,
      sort_order: categories.length,
    });
    if (error) {
      setFormError(
        error.code === "23505"
          ? "A category with this name already exists."
          : "The category could not be added. Please try again."
      );
      return;
    }
    setNewCategoryName("");
    load();
  };

  const removeCategory = async (categoryId) => {
    if (!confirm("Delete this category and all its items?")) return;
    const { error } = await supabase.from("menu_categories").delete().eq("id", categoryId);
    if (error) {
      setFormError("The category could not be deleted. Please try again.");
      return;
    }
    load();
  };

  const addItem = async (category) => {
    setFormError(null);
    const draft = newItemByCategory[category.id] ?? emptyItem;
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (!name) {
      setFormError("Item name is required.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Price must be a number greater than zero.");
      return;
    }
    const { error } = await supabase.from("menu_items").insert({
      tenant_id: tenant.id,
      category_id: category.id,
      name,
      description: draft.description.trim(),
      price,
      is_featured: Boolean(draft.is_featured),
      sort_order: category.menu_items?.length ?? 0,
    });
    if (error) {
      setFormError(
        error.code === "23505"
          ? "An item with this name already exists in this category."
          : "The item could not be added. Please try again."
      );
      return;
    }
    setNewItemByCategory({ ...newItemByCategory, [category.id]: emptyItem });
    load();
  };

  const toggleAvailable = async (item) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    if (error) {
      setFormError("Availability could not be changed. Please try again.");
      return;
    }
    load();
  };

  const toggleFeatured = async (item) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_featured: !item.is_featured })
      .eq("id", item.id);
    if (error) {
      setFormError("Featured status could not be changed. Please try again.");
      return;
    }
    load();
  };

  const removeItem = async (itemId) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
    if (error) {
      setFormError("The item could not be deleted. Please try again.");
      return;
    }
    load();
  };

  const setDraft = (categoryId, field, value) => {
    setNewItemByCategory({
      ...newItemByCategory,
      [categoryId]: { ...(newItemByCategory[categoryId] ?? emptyItem), [field]: value },
    });
  };

  const persistItemOrder = async (category, orderedItems) => {
    const results = await Promise.all(orderedItems.map((item, index) =>
      supabase.from("menu_items")
        .update({ sort_order: index })
        .eq("id", item.id)
        .eq("tenant_id", tenant.id)
    ));
    if (results.some((result) => result.error)) {
      setFormError("Menu order could not be saved. Please try again.");
      await load();
      return;
    }
    setCategories((current) => current.map((entry) => entry.id === category.id
      ? { ...entry, menu_items: orderedItems.map((item, index) => ({ ...item, sort_order: index })) }
      : entry));
  };

  const moveItem = async (category, itemId, direction) => {
    const orderedItems = [...(category.menu_items ?? [])];
    const index = orderedItems.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedItems.length) return;
    [orderedItems[index], orderedItems[nextIndex]] = [orderedItems[nextIndex], orderedItems[index]];
    await persistItemOrder(category, orderedItems);
  };

  const updateSelectedItems = async (patch) => {
    setFormError(null);
    const results = await Promise.all(selectedItemIds.map((id) =>
      supabase.from("menu_items")
        .update(patch)
        .eq("id", id)
        .eq("tenant_id", tenant.id)
    ));
    if (results.some((result) => result.error)) {
      setFormError("Some menu changes could not be saved. The menu has been refreshed.");
      await load();
      return;
    }
    setSelectedItemIds([]);
    await load();
  };

  const moveSelectedToTop = async () => {
    const reordered = categories.map((category) => {
      const items = category.menu_items ?? [];
      const selected = items.filter((item) => selectedItemIds.includes(item.id));
      if (selected.length === 0) return null;
      const remaining = items.filter((item) => !selectedItemIds.includes(item.id));
      return persistItemOrder(category, [...selected, ...remaining]);
    }).filter(Boolean);
    await Promise.all(reordered);
    if (reordered.length > 0) setSelectedItemIds([]);
  };

  const allItemIds = categories.flatMap((category) => (category.menu_items ?? []).map((item) => item.id));

  return (
    <div className="max-w-3xl">
      <div className="mb-8 rounded-sm border border-dark/10 bg-white p-6 shadow-[0_18px_38px_rgba(28,24,20,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dark/50">Editorial workflow</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-dark">Menu</h1>
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
      {formError && (
        <p role="alert" className="text-sm text-red-700 mb-4">{formError}</p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-dark/10 py-3">
        <span className="mr-2 text-xs font-medium text-dark/55">{selectedItemIds.length} selected</span>
        <button type="button" onClick={() => setSelectedItemIds(selectedItemIds.length === allItemIds.length ? [] : allItemIds)} className="text-xs font-semibold text-dark underline underline-offset-4">
          {selectedItemIds.length === allItemIds.length && allItemIds.length > 0 ? "Clear selection" : "Select all"}
        </button>
        {selectedItemIds.length > 0 && <>
          <button type="button" onClick={() => updateSelectedItems({ is_available: true })} className="rounded-sm border border-dark/15 px-3 py-2 text-xs font-semibold hover:border-gold">Make available</button>
          <button type="button" onClick={() => updateSelectedItems({ is_available: false })} className="rounded-sm border border-dark/15 px-3 py-2 text-xs font-semibold hover:border-gold">Make unavailable</button>
          <button type="button" onClick={() => updateSelectedItems({ is_featured: true })} className="rounded-sm border border-dark/15 px-3 py-2 text-xs font-semibold hover:border-gold">Feature selected</button>
          <button type="button" onClick={() => updateSelectedItems({ is_featured: false })} className="rounded-sm border border-dark/15 px-3 py-2 text-xs font-semibold hover:border-gold">Unfeature selected</button>
          <button type="button" onClick={moveSelectedToTop} className="rounded-sm bg-dark px-3 py-2 text-xs font-semibold text-white hover:bg-dark-light">Move to top</button>
        </>}
      </div>

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-sm shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-xl font-semibold">{category.name}</h2>
              <button
                onClick={() => removeCategory(category.id)}
                className="text-xs text-dark/40 hover:text-red-600"
              >
                Delete category
              </button>
            </div>

            <div className="mb-3 flex items-center justify-between border-b border-dark/10 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-dark/50">Featured dishes</h3>
              <span className="text-xs text-dark/40">
                {(category.menu_items ?? []).filter((item) => item.is_featured).length} highlighted
              </span>
            </div>

            <div className="space-y-3">
              {(category.menu_items ?? []).map((item) => (
                <div key={item.id} className="flex flex-wrap items-start gap-3 py-3 border-t border-dark/10 first:border-t-0">
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.name}`}
                    checked={selectedItemIds.includes(item.id)}
                    onChange={(event) => setSelectedItemIds(event.target.checked
                      ? [...selectedItemIds, item.id]
                      : selectedItemIds.filter((id) => id !== item.id))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${item.is_available ? "" : "line-through text-dark/30"}`}>
                        {item.name} — {formatPrice(item.price)}
                      </p>
                      {item.is_featured && (
                        <span className="rounded-full bg-gold/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dark/50">{item.description}</p>
                  </div>
                  <button
                    onClick={() => toggleFeatured(item)}
                    className="text-xs text-gold-dark whitespace-nowrap"
                  >
                    {item.is_featured ? "Mark unfeatured" : "Mark featured"}
                  </button>
                  <button
                    onClick={() => toggleAvailable(item)}
                    className="text-xs text-gold-dark whitespace-nowrap"
                  >
                    {item.is_available ? "Mark unavailable" : "Mark available"}
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-dark/40 hover:text-red-600"
                  >
                    Delete
                  </button>
                  <div className="flex gap-1">
                    <button type="button" aria-label={`Move ${item.name} up`} disabled={(category.menu_items ?? [])[0]?.id === item.id} onClick={() => moveItem(category, item.id, -1)} className="rounded-sm border border-dark/10 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                    <button type="button" aria-label={`Move ${item.name} down`} disabled={(category.menu_items ?? []).at(-1)?.id === item.id} onClick={() => moveItem(category, item.id, 1)} className="rounded-sm border border-dark/10 px-2 py-1 text-xs disabled:opacity-30">↓</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-dark/10 grid grid-cols-1 md:grid-cols-[2fr_3fr_1fr_1fr_auto] gap-2">
              <input
                aria-label={`New item name in ${category.name}`}
                placeholder="Item name"
                value={newItemByCategory[category.id]?.name ?? ""}
                onChange={(e) => setDraft(category.id, "name", e.target.value)}
                className="px-3 py-2 border border-dark/20 rounded-sm bg-cream/50 text-sm"
              />
              <input
                aria-label={`New item description in ${category.name}`}
                placeholder="Description"
                value={newItemByCategory[category.id]?.description ?? ""}
                onChange={(e) => setDraft(category.id, "description", e.target.value)}
                className="px-3 py-2 border border-dark/20 rounded-sm bg-cream/50 text-sm"
              />
              <input
                aria-label={`New item price in ${category.name}`}
                placeholder="Price"
                type="number"
                step="0.01"
                min="0.01"
                value={newItemByCategory[category.id]?.price ?? ""}
                onChange={(e) => setDraft(category.id, "price", e.target.value)}
                className="px-3 py-2 border border-dark/20 rounded-sm bg-cream/50 text-sm"
              />
              <label className="flex items-center gap-2 px-3 py-2 border border-dark/20 rounded-sm bg-cream/50 text-sm">
                <input
                  type="checkbox"
                  checked={newItemByCategory[category.id]?.is_featured ?? false}
                  onChange={(e) => setDraft(category.id, "is_featured", e.target.checked)}
                />
                Featured
              </label>
              <button
                onClick={() => addItem(category)}
                className="px-4 py-2 bg-dark text-white text-sm rounded-sm hover:bg-dark-light"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addCategory} className="mt-8 flex gap-2">
        <input
          aria-label="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name (e.g. Specials)"
          className="flex-1 px-4 py-3 border border-dark/20 rounded-sm bg-white"
        />
        <button type="submit" className="px-6 py-3 bg-gold text-dark text-sm font-semibold rounded-sm hover:bg-gold-light">
          Add category
        </button>
      </form>
    </div>
  );
}
