// Golden Fork gallery refresh: replace generated placeholder tiles with real
// CC-licensed photography (Flickr via Openverse, all URLs verified 200).
//
// Usage (local stack):
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed-golden-gallery.mjs
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

const gallery = [
  { url: "https://live.staticflickr.com/3605/3462139773_0a6f05e2d3_b.jpg", caption: "Grilled steak, peppers vinaigrette" },
  { url: "https://live.staticflickr.com/3844/14620330273_9ed16cd5a5_b.jpg", caption: "Seared scallops, brown butter" },
  { url: "https://live.staticflickr.com/2699/4073208563_04ca5ec714_b.jpg", caption: "The dining room" },
  { url: "https://live.staticflickr.com/5265/5612006365_657be8c954_b.jpg", caption: "Dark chocolate, sea salt" },
  { url: "https://live.staticflickr.com/3246/3020750515_a738dfd38a_b.jpg", caption: "Poured by the glass" },
  { url: "https://live.staticflickr.com/2283/2259686201_9e75b8559e_b.jpg", caption: "Grilled chicken caesar" },
  { url: "https://live.staticflickr.com/4453/37683706282_de961d9889_b.jpg", caption: "French onion soup" },
  { url: "https://live.staticflickr.com/3551/3462138775_e8e16390b7_b.jpg", caption: "Off the grill" },
];

const { data: tenant, error: tenantError } = await supabase
  .from("tenants")
  .select("id")
  .eq("slug", "golden-fork")
  .single();
if (tenantError) throw tenantError;

await supabase.from("gallery_images").delete().eq("tenant_id", tenant.id);
const { error: galleryError } = await supabase.from("gallery_images").insert(
  gallery.map((g, i) => ({
    tenant_id: tenant.id,
    storage_path: `remote/golden-fork-${String(i + 1).padStart(2, "0")}`,
    public_url: g.url,
    caption: g.caption,
    sort_order: i,
  }))
);
if (galleryError) throw galleryError;
console.log("Golden Fork gallery refreshed:", gallery.length, "photos");
