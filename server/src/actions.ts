import { defineAction, z, type ActionsModule } from "@hatch/space-sdk";
import { desc, eq, sql } from "drizzle-orm";
import * as schema from "./schema";

const ugcShape = z.object({
  id: z.number(),
  name: z.string(),
  handle: z.string(),
  city: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  caption: z.string(),
  rating: z.number(),
  imageKey: z.string(),
  likes: z.number(),
  isSeed: z.boolean(),
  createdAt: z.string(),
});

type UgcRow = typeof schema.ugcPosts.$inferSelect;
function toUgc(r: UgcRow): z.infer<typeof ugcShape> {
  return {
    id: r.id,
    name: r.name,
    handle: r.handle,
    city: r.city,
    productName: r.productName,
    productSlug: r.productSlug,
    caption: r.caption,
    rating: r.rating,
    imageKey: r.imageKey,
    likes: r.likes,
    isSeed: r.isSeed === 1,
    createdAt: r.createdAt.toISOString(),
  };
}

const SEED_UGC: Array<Omit<UgcRow, "id" | "createdAt"> & { daysAgo: number }> = [
  {
    name: "Ayesha Khan",
    handle: "@ayesha.styles",
    city: "Karachi",
    productName: "Teal Noor Kurta",
    productSlug: "sage",
    caption: "Mirror selfie wala din! Fabric itna soft hai, poora din university mein comfortable rahi. Gulnaar wali embroidery real mein aur bhi khoobsurat hai ✨",
    rating: 5,
    imageKey: "ugc-1",
    likes: 248,
    isSeed: 1,
    daysAgo: 2,
  },
  {
    name: "Bilal Ahmed",
    handle: "@bilal.eats.travels",
    city: "Lahore",
    productName: "Olive Casual Kurta",
    productSlug: "navy",
    caption: "Cafe day with friends — ANDAAZ ka kurta pehna to sab ne poocha kahan se liya. Casual bhi, classy bhi. Mera new favourite!",
    rating: 5,
    imageKey: "ugc-2",
    likes: 186,
    isSeed: 1,
    daysAgo: 4,
  },
  {
    name: "Fatima Noor",
    handle: "@fatima.noor",
    city: "Islamabad",
    productName: "Gulnaar Maroon Kurta",
    productSlug: "maroon",
    caption: "Cousin ki shaadi mein ye pehna tha — har photo mein shine kar raha tha. Velvet feel, gold kaam, aur compliments ruk hi nahi rahe thay!",
    rating: 5,
    imageKey: "ugc-3",
    likes: 412,
    isSeed: 1,
    daysAgo: 6,
  },
  {
    name: "The Siddiqui Family",
    handle: "@siddiqui.family",
    city: "Hyderabad",
    productName: "Eid Family Edit",
    productSlug: "ivory",
    caption: "Is Eid poori family ne ANDAAZ pehna. Bachon se le kar Abu tak — sab ka size perfect aya. Ye photo hamari sab se pyaari Eid memory hai.",
    rating: 5,
    imageKey: "ugc-4",
    likes: 529,
    isSeed: 1,
    daysAgo: 9,
  },
];

export const Actions = {
  getHome: defineAction({
    description: "Load the home page data: community UGC looks, the saved WhatsApp order number, and the total looks count.",
    request: z.object({}),
    response: z.object({
      ugc: z.array(ugcShape),
      whatsappNumber: z.string(),
      totalLooks: z.number(),
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      // Dedupe any duplicate seed rows from concurrent first loads (keep lowest id per handle)
      const allRows = await db.select({ id: schema.ugcPosts.id, handle: schema.ugcPosts.handle }).from(schema.ugcPosts).where(eq(schema.ugcPosts.isSeed, 1));
      const seenHandles = new Set<string>();
      for (const r of [...allRows].sort((a, b) => a.id - b.id)) {
        if (seenHandles.has(r.handle)) {
          await db.delete(schema.ugcPosts).where(eq(schema.ugcPosts.id, r.id));
        } else seenHandles.add(r.handle);
      }
      // Seed starter community looks once if empty — claim via settings PK so concurrent calls can't double-seed
      const existing = await db.select({ id: schema.ugcPosts.id }).from(schema.ugcPosts).limit(1);
      let claimed = false;
      if (existing.length === 0) {
        const claim = await db.insert(schema.settings).values({ key: "ugc_seeded_v1", value: "1" }).onConflictDoNothing().returning({ key: schema.settings.key });
        claimed = claim.length > 0;
      }
      if (claimed) {
        const now = Date.now();
        for (const s of SEED_UGC) {
          await db.insert(schema.ugcPosts).values({
            name: s.name,
            handle: s.handle,
            city: s.city,
            productName: s.productName,
            productSlug: s.productSlug,
            caption: s.caption,
            rating: s.rating,
            imageKey: s.imageKey,
            likes: s.likes,
            isSeed: 1,
            createdAt: new Date(now - s.daysAgo * 86400000),
          });
        }
      }
      const rows = await db.select().from(schema.ugcPosts).orderBy(desc(schema.ugcPosts.likes), desc(schema.ugcPosts.id));
      const settingRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "whatsapp"));
      const whatsappNumber = settingRows[0]?.value ?? "";
      return { ugc: rows.map(toUgc), whatsappNumber, totalLooks: rows.length };
    },
  }),

  submitUgc: defineAction({
    description: "Publish a customer's shared look (name, city, product, caption, rating, photo style) to the Styled By You gallery.",
    request: z.object({
      name: z.string().min(2).max(60),
      handle: z.string().max(40).default(""),
      city: z.string().max(40).default(""),
      productName: z.string().min(2).max(80),
      productSlug: z.string().max(40).default(""),
      caption: z.string().min(10).max(600),
      rating: z.number().int().min(1).max(5).default(5),
      imageKey: z.string().max(20).default("ugc-1"),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const res = await db.insert(schema.ugcPosts).values({
        name: args.name.trim(),
        handle: args.handle.trim(),
        city: args.city.trim(),
        productName: args.productName.trim(),
        productSlug: args.productSlug,
        caption: args.caption.trim(),
        rating: args.rating,
        imageKey: args.imageKey,
        likes: 0,
        isSeed: 0,
      }).returning({ id: schema.ugcPosts.id });
      const row = res[0];
      if (!row) throw new Error("submit failed");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),

  likeUgc: defineAction({
    description: "Add one like to a community look in the Styled By You gallery and return its new like count.",
    request: z.object({ id: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true), likes: z.number() }),
    async handler(ctx, args): Promise<{ ok: true; likes: number }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.ugcPosts).set({ likes: sql`${schema.ugcPosts.likes} + 1` }).where(eq(schema.ugcPosts.id, args.id));
      const rows = await db.select({ likes: schema.ugcPosts.likes }).from(schema.ugcPosts).where(eq(schema.ugcPosts.id, args.id));
      ctx.invalidateQueries();
      return { ok: true, likes: rows[0]?.likes ?? 0 };
    },
  }),

  saveWhatsapp: defineAction({
    description: "Save the brand owner's WhatsApp number so all order buttons message that number.",
    request: z.object({ number: z.string().max(30) }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const clean = args.number.replace(/[^0-9]/g, "");
      const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, "whatsapp"));
      if (existing.length === 0) {
        await db.insert(schema.settings).values({ key: "whatsapp", value: clean });
      } else {
        await db.update(schema.settings).set({ value: clean }).where(eq(schema.settings.key, "whatsapp"));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  // keep scaffold actions for compatibility (unused by UI)
  listEntries: defineAction({
    description: "List recent scaffold entries (legacy compatibility action, unused by the current UI).",
    request: z.object({ limit: z.number().int().positive().max(100).default(20) }),
    response: z.object({ entries: z.array(z.object({ id: z.number(), text: z.string(), created_at: z.string() })) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.entries).orderBy(desc(schema.entries.id)).limit(args.limit);
      return { entries: rows.map((r) => ({ id: r.id, text: r.text, created_at: r.createdAt.toISOString() })) };
    },
  }),
  addEntry: defineAction({
    description: "Add a scaffold entry (legacy compatibility action, unused by the current UI).",
    request: z.object({ text: z.string().min(1) }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const res = await db.insert(schema.entries).values({ text: args.text }).returning({ id: schema.entries.id });
      const row = res[0];
      if (!row) throw new Error("insert failed");
      ctx.invalidateQueries();
      return { id: row.id };
    },
  }),
} satisfies ActionsModule;
