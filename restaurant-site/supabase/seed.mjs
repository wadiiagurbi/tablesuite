// One-time seed: creates "The Golden Fork" as the first real tenant, carrying over the
// content that used to live in src/data/restaurantInfo.js and src/data/menuData.js
// (both deleted once this has been run), plus a demo owner login and a gallery.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
//
// Optional: put real photos in supabase/seed-assets/gallery/ first (see the README
// there) — any caption without a matching file gets a generated placeholder tile.
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@thegoldenfork.com";
const DEMO_OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "GoldenFork123!";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role, not anon) before seeding."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const restaurantInfo = {
  slug: "golden-fork",
  name: "The Golden Fork",
  tagline: "Where Every Meal Becomes a Memory",
  description:
    "Nestled in the heart of downtown, The Golden Fork is a celebration of contemporary cuisine rooted in timeless technique. Our chefs craft each dish with locally sourced, seasonal ingredients — turning simple moments into unforgettable dining experiences.",
  address: "142 Maple Avenue, Downtown, NY 10001",
  phone: "(212) 555-0198",
  email: "hello@thegoldenfork.com",
  hours: {
    "Monday - Thursday": "5:00 PM - 10:00 PM",
    "Friday - Saturday": "5:00 PM - 11:00 PM",
    Sunday: "11:00 AM - 9:00 PM",
  },
  social: { instagram: "#", facebook: "#", twitter: "#" },
};

const menuCategories = [
  {
    name: "Appetizers",
    items: [
      { name: "Bruschetta Trio", description: "Classic tomato basil, whipped ricotta & honey, and roasted pepper — served with crostini", price: 14 },
      { name: "Seared Scallops", description: "Pan-seared diver scallops on cauliflower purée with crispy pancetta and brown butter", price: 18 },
      { name: "Burrata Salad", description: "Creamy burrata with heirloom tomatoes, fresh basil, aged balsamic, and extra virgin olive oil", price: 16 },
      { name: "French Onion Soup", description: "Slow-caramelized onions in rich beef broth, topped with a gruyère crouton", price: 12 },
    ],
  },
  {
    name: "Mains",
    items: [
      { name: "Filet Mignon", description: "8oz center-cut filet, truffle demi-glace, roasted garlic mashed potatoes, and grilled asparagus", price: 48 },
      { name: "Pan-Roasted Salmon", description: "Atlantic salmon with lemon-dill beurre blanc, wild rice pilaf, and seasonal vegetables", price: 36 },
      { name: "Braised Short Ribs", description: "Slow-braised in red wine, served with creamy polenta and gremolata", price: 42 },
      { name: "Mushroom Risotto", description: "Arborio rice with wild mushroom medley, parmesan, truffle oil, and fresh herbs", price: 28 },
      { name: "Herb-Crusted Lamb Rack", description: "New Zealand lamb with rosemary jus, roasted root vegetables, and mint chimichurri", price: 46 },
    ],
  },
  {
    name: "Desserts",
    items: [
      { name: "Crème Brûlée", description: "Classic vanilla bean custard with a caramelized sugar crust", price: 12 },
      { name: "Chocolate Lava Cake", description: "Warm dark chocolate fondant with vanilla ice cream and berry coulis", price: 14 },
      { name: "Tiramisu", description: "Traditional Italian — espresso-soaked ladyfingers, mascarpone, cocoa", price: 13 },
      { name: "Seasonal Fruit Tart", description: "Buttery pastry shell with pastry cream and fresh seasonal fruits", price: 11 },
    ],
  },
  {
    name: "Drinks",
    items: [
      { name: "Signature Old Fashioned", description: "Bourbon, demerara sugar, angostura bitters, flamed orange zest", price: 16 },
      { name: "Lavender Martini", description: "Hendrick's gin, lavender syrup, fresh lemon, egg white foam", price: 15 },
      { name: "House Red Wine", description: "Cabernet Sauvignon — smooth with notes of cherry and oak", price: 14 },
      { name: "House White Wine", description: "Chardonnay — crisp with hints of citrus and vanilla", price: 13 },
      { name: "Sparkling Water", description: "San Pellegrino 750ml", price: 8 },
    ],
  },
];

const galleryCaptions = [
  "Signature Dishes",
  "Handmade Pasta",
  "Pastry Art",
  "Cocktail Hour",
  "Our Dining Room",
  "Garden Terrace",
  "Wine Cellar",
  "Private Events",
  "Open Kitchen",
];

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function placeholderSvg(caption) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1A1A1A"/>
        <stop offset="1" stop-color="#2A2A2A"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1200" fill="url(#g)"/>
    <rect x="60" y="60" width="1080" height="1080" fill="none" stroke="#C9A96E" stroke-width="2"/>
    <text x="600" y="600" fill="#C9A96E" font-family="Georgia, serif" font-size="56"
      text-anchor="middle" dominant-baseline="middle">${escapeXml(caption)}</text>
    <text x="600" y="660" fill="#FAF8F5" opacity="0.5" font-family="sans-serif" font-size="22"
      text-anchor="middle">Add a real photo to replace this placeholder</text>
  </svg>`;
}

async function main() {
  console.log("Creating demo owner auth user...");
  let ownerUser = null;
  let page = 1;
  const perPage = 50;
  for (;;) {
    const { data: userPage, error: listError } = await supabase.auth.admin.listUsers({ page, perPage });
    if (listError) throw listError;
    ownerUser = userPage.users.find((u) => u.email === DEMO_OWNER_EMAIL) ?? null;
    if (ownerUser || userPage.users.length < perPage) break;
    page += 1;
  }
  if (!ownerUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_OWNER_EMAIL,
      password: DEMO_OWNER_PASSWORD,
      email_confirm: true,
    });
    if (error && error.code !== "email_exists") throw error;
    ownerUser = data?.user ?? null;
    if (!ownerUser) {
      const { data: retry } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      ownerUser = retry.users.find((u) => u.email === DEMO_OWNER_EMAIL) ?? null;
    }
  }
  if (!ownerUser) throw new Error("could not resolve demo owner user");
  console.log(`Demo owner: ${DEMO_OWNER_EMAIL} (password from SEED_OWNER_PASSWORD env)`);

  console.log("Upserting tenant...");
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .upsert({ ...restaurantInfo }, { onConflict: "slug" })
    .select()
    .single();
  if (tenantError) throw tenantError;

  const { error: adminError } = await supabase
    .from("tenant_admins")
    .upsert(
      { tenant_id: tenant.id, user_id: ownerUser.id, role: "owner" },
      { onConflict: "tenant_id,user_id" }
    );
  if (adminError) throw adminError;

  console.log("Seeding menu...");
  for (let i = 0; i < menuCategories.length; i++) {
    const cat = menuCategories[i];
    const { data: category, error: catError } = await supabase
      .from("menu_categories")
      .upsert(
        { tenant_id: tenant.id, name: cat.name, sort_order: i },
        { onConflict: "tenant_id,name", ignoreDuplicates: false }
      )
      .select()
      .single();
    if (catError) throw catError;

    for (let j = 0; j < cat.items.length; j++) {
      const item = cat.items[j];
      const { error: itemError } = await supabase.from("menu_items").upsert(
        {
          tenant_id: tenant.id,
          category_id: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          sort_order: j,
        },
        { onConflict: "tenant_id,category_id,name", ignoreDuplicates: false }
      );
      if (itemError) throw itemError;
    }
  }

  console.log("Seeding gallery...");
  const assetsDir = path.join(__dirname, "seed-assets", "gallery");
  for (let i = 0; i < galleryCaptions.length; i++) {
    const caption = galleryCaptions[i];
    const slug = slugify(caption);
    const extensions = [".jpg", ".jpeg", ".png", ".webp"];
    const realFile = extensions
      .map((ext) => path.join(assetsDir, `${slug}${ext}`))
      .find((p) => existsSync(p));

    let storagePath, fileBody, contentType;
    if (realFile) {
      fileBody = await readFile(realFile);
      const ext = path.extname(realFile);
      storagePath = `${tenant.id}/${slug}${ext}`;
      contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    } else {
      fileBody = placeholderSvg(caption);
      storagePath = `${tenant.id}/${slug}.svg`;
      contentType = "image/svg+xml; charset=utf-8";
    }

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(storagePath, fileBody, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from("gallery").getPublicUrl(storagePath);

    const { error: galleryError } = await supabase.from("gallery_images").upsert(
      {
        tenant_id: tenant.id,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
        caption,
        sort_order: i,
      },
      { onConflict: "tenant_id,storage_path", ignoreDuplicates: false }
    );
    if (galleryError) throw galleryError;
  }

  console.log(`Done. Visit /site/${tenant.slug} and log in to /admin as ${DEMO_OWNER_EMAIL}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
