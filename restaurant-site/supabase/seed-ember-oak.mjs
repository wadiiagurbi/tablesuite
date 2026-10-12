// Second demo tenant: Ember & Oak, a wood-fired pizza joint with real
// CC-licensed photography (Flickr via Openverse, all URLs verified 200).
// Gallery uses remote public_urls directly; storage_path is a label row.
//
// Usage (local stack):
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed-ember-oak.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tenant = {
  slug: "ember-oak",
  name: "Ember & Oak",
  tagline: "Wood-fired pizza, natural wine, loud room.",
  description:
    "A neighborhood pizzeria built around a single oak-burning oven. Ninety seconds at 900 degrees, natural wine by the glass, and a dining room that hums until late.",
  address: "88 Kiln Street, Portland, OR 97209",
  phone: "(503) 555-0147",
  email: "ciao@emberandoak.com",
  hours: {
    "Tuesday - Thursday": "5:00 PM - 10:00 PM",
    "Friday - Saturday": "12:00 PM - 11:00 PM",
    Sunday: "12:00 PM - 9:00 PM",
    Monday: "Closed",
  },
  social: { instagram: "#", facebook: "#", twitter: "#" },
  status: "active",
};

const menu = [
  {
    name: "Starters",
    items: [
      { name: "Burrata & grilled bread", description: "Creamy puglian burrata, charred bread, basil oil", price: 12 },
      { name: "Charred shishitos", description: "Blistered peppers, flaky salt, lemon aioli", price: 9 },
      { name: "Garlic knots", description: "Wood-oven knots, garlic butter, pecorino", price: 7 },
    ],
  },
  {
    name: "Wood-fired pizzas",
    items: [
      { name: "Margherita", description: "San Marzano tomato, fior di latte, basil, cold-pressed olive oil", price: 16 },
      { name: "Pesto pie", description: "Basil pesto base, smoked mozzarella, pine nuts", price: 18 },
      { name: "Diavola", description: "Spicy salami, tomato, mozzarella, hot honey", price: 19 },
      { name: "Cast-iron deep dish", description: "Baked in the skillet, caramelized crust, sunday sauce", price: 21 },
    ],
  },
  {
    name: "Desserts",
    items: [
      { name: "Tiramisu", description: "Espresso-soaked savoiardi, mascarpone, cocoa top", price: 9 },
      { name: "Olive oil cake", description: "Citrus glaze, whipped ricotta", price: 8 },
    ],
  },
  {
    name: "Drinks",
    items: [
      { name: "House red (glass)", description: "Rotating natural red, ask your server", price: 11 },
      { name: "House white (glass)", description: "Crisp and cold, always", price: 11 },
      { name: "Birra", description: "Italian lager, 33cl", price: 6 },
      { name: "Espresso", description: "Short and dark", price: 3.5 },
    ],
  },
];

const gallery = [
  { url: "https://live.staticflickr.com/3896/15001475025_08322a7270_b.jpg", caption: "The oven at full roar" },
  { url: "https://live.staticflickr.com/8326/8107500946_d50d2a3010.jpg", caption: "Margherita, blistered" },
  { url: "https://live.staticflickr.com/43/124280700_74e2365962_b.jpg", caption: "Napoli style, basil and fior di latte" },
  { url: "https://live.staticflickr.com/108/305472501_93735ea112_b.jpg", caption: "Pesto pie, weekend special" },
  { url: "https://live.staticflickr.com/4069/4361572147_c7e23180fe_b.jpg", caption: "Cast-iron deep dish" },
  { url: "https://live.staticflickr.com/4025/4259298296_9dc96aa52d_b.jpg", caption: "Tiramisu, cocoa top" },
  { url: "https://live.staticflickr.com/971/40276940110_7dcfb18064_b.jpg", caption: "The dining room" },
  { url: "https://live.staticflickr.com/7376/27615289934_a759f22830_b.jpg", caption: "Ninety seconds at 900 degrees" },
];

const { data: tenantRow, error: tenantError } = await supabase
  .from("tenants")
  .upsert(tenant, { onConflict: "slug" })
  .select("id")
  .single();
if (tenantError) throw tenantError;
const tenantId = tenantRow.id;
console.log("Tenant:", tenant.slug, tenantId);

let order = 0;
for (const cat of menu) {
  const { data: catRow, error: catError } = await supabase
    .from("menu_categories")
    .upsert({ tenant_id: tenantId, name: cat.name, sort_order: order }, { onConflict: "tenant_id,name" })
    .select("id")
    .single();
  if (catError) throw catError;
  order += 1;
  await supabase.from("menu_items").delete().eq("category_id", catRow.id);
  const rows = cat.items.map((item, i) => ({
    tenant_id: tenantId,
    category_id: catRow.id,
    name: item.name,
    description: item.description,
    price: item.price,
    is_available: true,
    sort_order: i,
  }));
  const { error: itemError } = await supabase.from("menu_items").insert(rows);
  if (itemError) throw itemError;
}
console.log("Menu seeded:", menu.length, "categories");

await supabase.from("gallery_images").delete().eq("tenant_id", tenantId);
const { error: galleryError } = await supabase.from("gallery_images").insert(
  gallery.map((g, i) => ({
    tenant_id: tenantId,
    storage_path: `remote/ember-oak-${String(i + 1).padStart(2, "0")}`,
    public_url: g.url,
    caption: g.caption,
    sort_order: i,
  }))
);
if (galleryError) throw galleryError;
console.log("Gallery seeded:", gallery.length, "photos");
console.log("Done. Visit /site/ember-oak");
