import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const ugcPosts = sqliteTable("ugc_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  handle: text("handle").notNull().default(""),
  city: text("city").notNull().default(""),
  productName: text("product_name").notNull(),
  productSlug: text("product_slug").notNull().default(""),
  caption: text("caption").notNull(),
  rating: integer("rating").notNull().default(5),
  imageKey: text("image_key").notNull().default("ugc-1"),
  likes: integer("likes").notNull().default(0),
  isSeed: integer("is_seed").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
