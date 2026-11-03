CREATE TABLE ugc_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  handle TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  image_key TEXT NOT NULL DEFAULT 'ugc-1',
  likes INTEGER NOT NULL DEFAULT 0,
  is_seed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
