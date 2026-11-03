import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

import heroImg from "./assets/hero.webp";
import pMaroon from "./assets/p-maroon.webp";
import pIvory from "./assets/p-ivory.webp";
import pMustard from "./assets/p-mustard.webp";
import pSage from "./assets/p-sage.webp";
import pNavy from "./assets/p-navy.webp";
import pPink from "./assets/p-pink.webp";
import ugc1 from "./assets/ugc-1.webp";
import ugc2 from "./assets/ugc-2.webp";
import ugc3 from "./assets/ugc-3.webp";
import ugc4 from "./assets/ugc-4.webp";

const IMG: Record<string, string> = {
  hero: heroImg, maroon: pMaroon, ivory: pIvory, mustard: pMustard, sage: pSage, navy: pNavy, pink: pPink,
  "ugc-1": ugc1, "ugc-2": ugc2, "ugc-3": ugc3, "ugc-4": ugc4,
};

type Swatch = { name: string; hex: string };
type Product = {
  slug: string; name: string; urdu: string; cat: string; price: number; old?: number;
  img: string; tag?: string; desc: string; swatches: Swatch[]; sizes: string[]; fav?: boolean;
};

const PRODUCTS: Product[] = [
  { slug: "maroon", name: "Gulnaar Maroon Kurta", urdu: "گلنار", cat: "Women", price: 4499, old: 5999, img: "maroon", tag: "BESTSELLER", fav: true, desc: "Deep maroon khaddar kurta with hand-finished gold tilla embroidery on the neckline and sleeves. The one everyone asks about at shaadis.", sizes: ["S", "M", "L", "XL"], swatches: [{ name: "Maroon", hex: "#7A2233" }, { name: "Bottle Green", hex: "#1F4D3A" }, { name: "Navy", hex: "#1E2A4A" }] },
  { slug: "ivory", name: "Nawab Ivory Set + Waistcoat", urdu: "نواب", cat: "Men", price: 6999, old: 8499, img: "ivory", tag: "FESTIVE", desc: "Ivory kurta shalwar with an embroidered waistcoat — nikkah, Eid or a family dinner, this set carries the whole room.", sizes: ["S", "M", "L", "XL", "XXL"], swatches: [{ name: "Ivory", hex: "#EFE6D4" }, { name: "Sand", hex: "#D9C29A" }, { name: "Charcoal", hex: "#3A3A3C" }] },
  { slug: "mustard", name: "Haldi Glow 2-Piece", urdu: "ہلدی", cat: "Women", price: 5299, img: "mustard", tag: "NEW", fav: true, desc: "Sunshine mustard 2-piece with a flowing dupatta. Made for haldi mornings, mehndi dances and photos that pop.", sizes: ["S", "M", "L", "XL"], swatches: [{ name: "Mustard", hex: "#E0A81C" }, { name: "Mehndi Green", hex: "#5C7247" }, { name: "Pink", hex: "#E58CA5" }] },
  { slug: "sage", name: "Sage Serenity Co-ord", urdu: "سکون", cat: "Women", price: 4899, img: "sage", desc: "Soft sage co-ord set — modern cut, breathable summer fabric, zero effort styling. University, office ya coffee run, sab ke liye perfect.", sizes: ["XS", "S", "M", "L"], swatches: [{ name: "Sage", hex: "#A8BFA5" }, { name: "Lilac", hex: "#C3A6D9" }, { name: "Powder Blue", hex: "#A9C6DE" }] },
  { slug: "navy", name: "Neelum Navy Kurta", urdu: "نیلم", cat: "Men", price: 3999, old: 4999, img: "navy", tag: "SALE", fav: true, desc: "Navy kurta with subtle tonal embroidery. Clean, sharp, and the fit our customers keep re-ordering in every colour.", sizes: ["S", "M", "L", "XL", "XXL"], swatches: [{ name: "Navy", hex: "#1E2A4A" }, { name: "Olive", hex: "#6B7043" }, { name: "Maroon", hex: "#7A2233" }] },
  { slug: "pink", name: "Gulab Blush Sharara", urdu: "گلاب", cat: "Women", price: 8499, img: "pink", tag: "LIMITED", fav: true, desc: "Blush pink festive sharara with full embroidery and a net dupatta. Barat-ready glamour, without the boutique price tag.", sizes: ["S", "M", "L", "XL"], swatches: [{ name: "Blush Pink", hex: "#F2B8C6" }, { name: "Mint", hex: "#BFE3D0" }, { name: "Gold", hex: "#D4A72C" }] },
];

const CATS = ["All", "Women", "Men", "Festive Picks"];
const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const PRICE_MIN = 3500;
const PRICE_MAX = 9000;
const fmt = (n: number) => "Rs " + n.toLocaleString("en-PK");

const COLOUR_OPTIONS: Swatch[] = (() => {
  const seen = new Map<string, string>();
  for (const p of PRODUCTS) for (const s of p.swatches) if (!seen.has(s.name)) seen.set(s.name, s.hex);
  return [...seen.entries()].map(([name, hex]) => ({ name, hex }));
})();

type CartLine = { slug: string; size: string; color: string; qty: number };

function recommendSize(heightCm: number, weightKg: number): { size: string; bmi: number; note: string } {
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  let idx = bmi < 18.5 ? 1 : bmi < 24 ? 2 : bmi < 28.5 ? 3 : 4; // index into S,M,L,XL base list below
  if (heightCm >= 183 && bmi >= 22.5) idx = Math.min(4, idx + 1); // tall frames need the extra length/room
  const sizes = ["XS", "S", "M", "L", "XL"];
  const size = sizes[idx] ?? "M";
  const note =
    size === "XS" || size === "S" ? "Slim fit — kurta tum par sharp lagega. Relaxed look chahiye to ek size upar try karo."
    : size === "M" ? "Classic regular fit — na zyada tight, na loose. Yehi hamara sab se zyada bikne wala size hai."
    : size === "L" ? "Comfortable roomy fit — shoulders aur chest mein poori jagah, festive khane ke baad bhi araam."
    : "Generous fit with full ease — embroidery wale pieces is size mein sab se ache drape hote hain.";
  return { size, bmi, note };
}

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return <span aria-label={`${n} out of 5 stars`} style={{ fontSize: size, color: "#FF5A1F", letterSpacing: 1 }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}


type ProductCardProps = {
  p: Product;
  delay?: number;
  onView: (p: Product) => void;
  onAdd: (p: Product) => void;
  waHref: string;
};

function ProductCard({ p, delay = 0, onView, onAdd, waHref }: ProductCardProps) {
  return (
    <article className="rv card-lift overflow-hidden border border-[var(--border)] bg-[var(--surface)]" style={{ borderRadius: 20, transitionDelay: `${delay}ms` }}>
      <button aria-label={`View ${p.name}`} onClick={() => onView(p)} className="relative block w-full overflow-hidden text-left">
        <img src={IMG[p.img]} alt={p.name} className="zoom aspect-[3/4] w-full object-cover" loading="lazy" />
        {p.tag && <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider text-white" style={{ background: p.tag === "SALE" ? "#C62828" : "var(--accent)" }}>{p.tag}</span>}
        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">Quick view</span>
      </button>
      <div className="p-3.5 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug md:text-base">{p.name}</h3>
          <span className="font-display text-lg italic" style={{ color: "var(--accent2)" }}>{p.urdu}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5" aria-label={`Colours: ${p.swatches.map(s => s.name).join(", ")}`}>
          {p.swatches.map(s => <span key={s.name} title={s.name} className="inline-block h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: s.hex }} />)}
          <span className="ml-1 text-xs text-[var(--dim)]">{p.cat} • {p.sizes.join("–")}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-black">{fmt(p.price)}</span>
          {p.old && <span className="text-sm text-[var(--dim)] line-through">{fmt(p.old)}</span>}
          {p.old && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "#C62828" }}>-{Math.round((1 - p.price / p.old) * 100)}%</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button aria-label={`Add ${p.name} to bag`} onClick={() => onAdd(p)} className="rounded-full py-2.5 text-[13px] font-bold" style={{ background: "var(--text)", color: "var(--bg)" }}>Add to Bag</button>
          <a aria-label={`Order ${p.name} on WhatsApp`} href={waHref} target="_blank" rel="noreferrer" className="rounded-full py-2.5 text-center text-[13px] font-bold text-white" style={{ background: "#1FA855" }}>WhatsApp Order</a>
        </div>
      </div>
    </article>
  );
}

export function App() {
  const qc = useQueryClient();
  const home = useQuery({ queryKey: ["home"], queryFn: () => api.getHome({}) });
  const ugc = home.data?.ugc ?? [];
  const whatsappSaved = home.data?.whatsappNumber ?? "";

  // shop filters
  const [cat, setCat] = useState("All");
  const [fColor, setFColor] = useState("All");
  const [fSize, setFSize] = useState("All");
  const [fMax, setFMax] = useState(PRICE_MAX);
  const [sort, setSort] = useState("featured");

  // product detail
  const [selected, setSelected] = useState<Product | null>(null);
  const [selSize, setSelSize] = useState("M");
  const [selColor, setSelColor] = useState("");
  const [selQty, setSelQty] = useState(1);

  // cart
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showBag, setShowBag] = useState(false);
  const [cartNote, setCartNote] = useState<{ name: string; size: string; color: string } | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [badgeKey, setBadgeKey] = useState(0);

  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState("");

  // size finder
  const [height, setHeight] = useState(168);
  const [weight, setWeight] = useState(68);
  const rec = useMemo(() => recommendSize(height, weight), [height, weight]);

  // submit form state
  const [fName, setFName] = useState("");
  const [fHandle, setFHandle] = useState("");
  const [fCity, setFCity] = useState("");
  const [fProduct, setFProduct] = useState(PRODUCTS[0]!.name);
  const [fCaption, setFCaption] = useState("");
  const [fRating, setFRating] = useState(5);
  const [fImage, setFImage] = useState("ugc-1");
  const [submitted, setSubmitted] = useState(false);
  const [waInput, setWaInput] = useState("");

  const likeMut = useMutation({
    mutationFn: (id: number) => api.likeUgc({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home"] }),
  });
  const submitMut = useMutation({
    mutationFn: () => api.submitUgc({
      name: fName, handle: fHandle, city: fCity, productName: fProduct,
      productSlug: PRODUCTS.find(p => p.name === fProduct)?.slug ?? "",
      caption: fCaption, rating: fRating, imageKey: fImage,
    }),
    onSuccess: () => {
      setSubmitted(true); setFName(""); setFHandle(""); setFCity(""); setFCaption("");
      qc.invalidateQueries({ queryKey: ["home"] });
      showToast("Your look is live in Styled By You!");
    },
  });
  const waMut = useMutation({
    mutationFn: (n: string) => api.saveWhatsapp({ number: n }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home"] }); showToast("WhatsApp number saved — order buttons are live!"); },
  });

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  // Scroll-reveal for .rv elements: a mount-once ticker that reveals anything
  // near the viewport — immune to re-render/refetch churn and filter remounts.
  useEffect(() => {
    const tick = () => {
      const limit = window.innerHeight + 500;
      document.querySelectorAll<HTMLElement>(".rv:not(.in)").forEach(e => {
        if (e.getBoundingClientRect().top < limit) e.classList.add("in");
      });
    };
    tick();
    const id = setInterval(tick, 600);
    const stop = setTimeout(() => clearInterval(id), 30000);
    // One-shot full reveal shortly after load: entrance motion for what is on
    // screen, and nothing anywhere on the page stays hidden or unusable.
    const all = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".rv:not(.in)").forEach(e => e.classList.add("in"));
    }, 2500);
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    return () => { clearInterval(id); clearTimeout(stop); clearTimeout(all); window.removeEventListener("scroll", tick); window.removeEventListener("resize", tick); };
  }, []);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter(p => {
      if (cat === "Women" || cat === "Men") { if (p.cat !== cat) return false; }
      if (cat === "Festive Picks" && !(p.tag === "FESTIVE" || p.tag === "LIMITED" || p.slug === "mustard" || p.slug === "maroon")) return false;
      if (fColor !== "All" && !p.swatches.some(s => s.name === fColor)) return false;
      if (fSize !== "All" && !p.sizes.includes(fSize)) return false;
      if (p.price > fMax) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "discount") list = [...list].sort((a, b) => ((b.old ?? b.price) - b.price) - ((a.old ?? a.price) - a.price));
    return list;
  }, [cat, fColor, fSize, fMax, sort]);

  const favourites = useMemo(() => PRODUCTS.filter(p => p.fav), []);
  const filtersActive = cat !== "All" || fColor !== "All" || fSize !== "All" || fMax < PRICE_MAX;
  function clearFilters() { setCat("All"); setFColor("All"); setFSize("All"); setFMax(PRICE_MAX); }

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((sum, l) => sum + (PRODUCTS.find(p => p.slug === l.slug)?.price ?? 0) * l.qty, 0);

  function openProduct(p: Product) {
    setSelected(p);
    setSelSize(p.sizes.includes("M") ? "M" : (p.sizes[0] ?? "M"));
    setSelColor(p.swatches[0]?.name ?? "");
    setSelQty(1);
  }

  function addToBag(p: Product, size: string, color: string, qty = 1) {
    setCart(prev => {
      const i = prev.findIndex(l => l.slug === p.slug && l.size === size && l.color === color);
      if (i >= 0) { const copy = [...prev]; copy[i] = { ...copy[i]!, qty: copy[i]!.qty + qty }; return copy; }
      return [...prev, { slug: p.slug, size, color, qty }];
    });
    setBadgeKey(k => k + 1);
    setCartNote({ name: p.name, size, color });
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setCartNote(null), 4500);
  }

  function quickAdd(p: Product) {
    addToBag(p, p.sizes.includes("M") ? "M" : (p.sizes[0] ?? "M"), p.swatches[0]?.name ?? "");
  }

  function waLink(product?: Product, sz?: string) {
    const num = (whatsappSaved || waInput).replace(/[^0-9]/g, "");
    const text = product
      ? encodeURIComponent(`Assalam-o-Alaikum ANDAAZ! I want to order: ${product.name} — ${fmt(product.price)} — Size: ${sz ?? selSize}. Please confirm availability.`)
      : encodeURIComponent("Assalam-o-Alaikum ANDAAZ! I have a question about your collection.");
    return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  function waCheckoutLink() {
    const num = (whatsappSaved || waInput).replace(/[^0-9]/g, "");
    const lines = cart.map(l => {
      const p = PRODUCTS.find(x => x.slug === l.slug);
      return p ? `• ${p.name} — Size ${l.size}, ${l.color} × ${l.qty} — ${fmt(p.price * l.qty)}` : "";
    }).filter(Boolean).join("\n");
    const text = encodeURIComponent(`Assalam-o-Alaikum ANDAAZ! I want to order:\n${lines}\nTotal: ${fmt(cartTotal)}\nPlease confirm availability.`);
    return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (fName.trim().length < 2 || fCaption.trim().length < 10) { showToast("Please add your name and a caption (10+ characters)."); return; }
    submitMut.mutate();
  }

  const reviews = ugc.slice(0, 6);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="#top" className="font-display text-[28px] font-black tracking-[0.14em]" aria-label="ANDAAZ home">ANDAAZ<span style={{ color: "var(--accent)" }}>.</span></a>
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex" aria-label="Main">
            <a href="#shop" className="hover:opacity-70">Shop</a>
            <a href="#favourites" className="hover:opacity-70">Favourites</a>
            <a href="#sizefinder" className="hover:opacity-70">Find Your Size</a>
            <a href="#styled" className="hover:opacity-70">Styled By You</a>
            <a href="#share" className="font-bold" style={{ color: "var(--accent)" }}>Share Your Look</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={waLink()} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white sm:block" style={{ background: "#1FA855" }}>WhatsApp</a>
            <button aria-label={`Open bag, ${cartCount} items`} onClick={() => setShowBag(true)} className="relative rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold">
              Bag {cartCount > 0 && <span key={badgeKey} className="pop ml-1 inline-block rounded-full px-2 py-0.5 text-xs text-white" style={{ background: "var(--accent)" }}>{cartCount}</span>}
            </button>
          </div>
        </div>
        <nav className="flex justify-center gap-5 pb-2 text-[13px] font-semibold md:hidden" aria-label="Mobile">
          <a href="#shop">Shop</a><a href="#favourites">Favourites</a><a href="#sizefinder">Size Finder</a><a href="#styled">Styled By You</a>
        </nav>
      </header>

      {/* Hero */}
      <section id="top" className="mx-auto max-w-6xl px-4 pt-4">
        <div className="relative overflow-hidden" style={{ borderRadius: 28 }}>
          <img src={heroImg} alt="ANDAAZ festive collection — woman in maroon embroidered kurta and man in ivory waistcoat set" className="kenburns h-[520px] w-full object-cover object-top md:h-[560px]" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,32,30,0.9) 0%, rgba(10,32,30,0.28) 48%, transparent 72%)" }} />
          <span className="floaty absolute right-5 top-5 hidden rounded-full px-3.5 py-2 text-xs font-black tracking-wide text-white shadow-lg md:block" style={{ background: "var(--accent2)" }}>COD • ALL PAKISTAN</span>
          <span className="floaty absolute right-5 top-[70px] hidden rounded-full bg-white/95 px-3.5 py-2 text-xs font-black tracking-wide shadow-lg md:block" style={{ color: "var(--accent)", animationDelay: "1.2s" }}>#MYANDAAZ COMMUNITY</span>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-10">
            <p className="hero-el text-xs font-bold tracking-[0.3em]" style={{ color: "#FFB59A", animationDelay: "0.05s" }}>NEW FESTIVE DROP • LIVE NOW</p>
            <h1 className="font-display hero-el mt-2 text-[44px] font-black leading-[0.95] tracking-tight md:text-[80px]" style={{ animationDelay: "0.18s" }}>Apna Andaaz,<br /><span style={{ color: "var(--accent)" }}>Apni Pehchan.</span></h1>
            <p className="hero-el mt-3 max-w-md text-[15px] leading-relaxed text-white/85" style={{ animationDelay: "0.32s" }}>Eastern wear made for real life — shaadis, Eid, university, office. Pehno, photo lo, aur <b>#MyAndaaz</b> mein apna look poori duniya ko dikhao.</p>
            <div className="hero-el mt-5 flex flex-wrap gap-3" style={{ animationDelay: "0.46s" }}>
              <a href="#shop" className="rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg" style={{ background: "var(--accent)" }}>Shop the Collection</a>
              <a href="#sizefinder" className="rounded-full bg-white px-6 py-3 text-sm font-bold" style={{ color: "var(--accent2)" }}>Find Your Size</a>
            </div>
            <div className="hero-el mt-6 flex gap-6 text-center" style={{ animationDelay: "0.6s" }}>
              <div><p className="font-display text-2xl font-extrabold">{PRODUCTS.length}</p><p className="text-[11px] tracking-wider text-white/70">SIGNATURE PIECES</p></div>
              <div><p className="font-display text-2xl font-extrabold">{ugc.length}</p><p className="text-[11px] tracking-wider text-white/70">LOOKS SHARED</p></div>
              <div><p className="font-display text-2xl font-extrabold">XS–XXL</p><p className="text-[11px] tracking-wider text-white/70">SIZE RANGE</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="mt-5 overflow-hidden py-2.5 text-white" style={{ background: "var(--accent)" }} aria-hidden="true">
        <div className="marquee-track text-[13px] font-bold tracking-[0.2em]">
          {[0, 1].map(k => (
            <span key={k} className="flex shrink-0">
              {["#MYANDAAZ", "@AYESHA.STYLES WORE GULNAAR", "COD ALL OVER PAKISTAN", "@FATIMA.NOOR'S SHAADI LOOK", "FREE DELIVERY OVER RS 5,000", "TAG US TO GET FEATURED"].map((t, i) => (
                <span key={i} className="mx-6">{t} ✦</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Your New Favourites */}
      <section id="favourites" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-12">
        <div className="rv flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em]" style={{ color: "var(--accent)" }}>MOST LOVED RIGHT NOW</p>
            <h2 className="font-display mt-1 text-4xl font-black tracking-tight md:text-5xl">Your New Favourites</h2>
          </div>
          <a href="#shop" className="text-sm font-bold underline underline-offset-4" style={{ color: "var(--accent2)" }}>Shop all →</a>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {favourites.map((p, i) => <ProductCard key={p.slug} p={p} delay={i * 90} onView={openProduct} onAdd={quickAdd} waHref={waLink(p, "M")} />)}
        </div>
      </section>

      {/* Shop with filters */}
      <section id="shop" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-14">
        <div className="rv flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em]" style={{ color: "var(--accent)" }}>THE COLLECTION</p>
            <h2 className="font-display mt-1 text-4xl font-black tracking-tight md:text-5xl">Shop the Drop</h2>
          </div>
          <p className="max-w-xs text-sm text-[var(--dim)]">Colour, size aur budget — teeno se filter karo. Jo pasand aye, aik tap mein bag mein.</p>
        </div>

        {/* Filter bar */}
        <div className="rv mt-6 border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5" style={{ borderRadius: 20 }} role="group" aria-label="Shop filters">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-black tracking-wider text-[var(--dim)]">CATEGORY</span>
            {CATS.map(c => (
              <button key={c} aria-label={`Category: ${c}`} aria-pressed={cat === c} onClick={() => setCat(c)}
                className="rounded-full border px-4 py-2 text-sm font-semibold"
                style={cat === c ? { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" } : { borderColor: "var(--border)", background: "var(--surface)" }}>{c}</button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
              Sort
              <select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="discount">Biggest Discount</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-black tracking-wider text-[var(--dim)]">COLOUR</span>
            <button aria-label="All colours" aria-pressed={fColor === "All"} onClick={() => setFColor("All")}
              className="rounded-full border px-3.5 py-1.5 text-[13px] font-semibold"
              style={fColor === "All" ? { background: "var(--accent2)", color: "#fff", borderColor: "var(--accent2)" } : { borderColor: "var(--border)" }}>All</button>
            {COLOUR_OPTIONS.map(s => (
              <button key={s.name} aria-label={`Colour: ${s.name}`} aria-pressed={fColor === s.name} onClick={() => setFColor(fColor === s.name ? "All" : s.name)}
                className="flex items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-3 text-[13px] font-semibold"
                style={fColor === s.name ? { borderColor: "var(--accent2)", background: "var(--surface2)", boxShadow: "0 0 0 1px var(--accent2)" } : { borderColor: "var(--border)" }}>
                <span className="inline-block h-4 w-4 rounded-full border border-black/15" style={{ background: s.hex }} />{s.name}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-black tracking-wider text-[var(--dim)]">SIZE</span>
              <button aria-label="All sizes" aria-pressed={fSize === "All"} onClick={() => setFSize("All")}
                className="h-9 min-w-9 rounded-full border px-2.5 text-[13px] font-bold"
                style={fSize === "All" ? { background: "var(--accent2)", color: "#fff", borderColor: "var(--accent2)" } : { borderColor: "var(--border)" }}>All</button>
              {ALL_SIZES.map(s => (
                <button key={s} aria-label={`Size ${s}`} aria-pressed={fSize === s} onClick={() => setFSize(fSize === s ? "All" : s)}
                  className="h-9 min-w-9 rounded-full border px-2 text-[13px] font-bold"
                  style={fSize === s ? { background: "var(--accent2)", color: "#fff", borderColor: "var(--accent2)" } : { borderColor: "var(--border)" }}>{s}</button>
              ))}
            </div>
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <span className="whitespace-nowrap text-xs font-black tracking-wider text-[var(--dim)]">MAX PRICE</span>
              <input type="range" min={PRICE_MIN} max={PRICE_MAX} step={250} value={fMax} onChange={e => setFMax(Number(e.target.value))}
                aria-label="Maximum price" className="price-range w-full" />
              <span className="whitespace-nowrap text-sm font-black" style={{ color: "var(--accent)" }}>{fMax >= PRICE_MAX ? "Any" : fmt(fMax)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
            <p className="text-sm font-semibold text-[var(--dim)]" role="status">{filtered.length} of {PRODUCTS.length} pieces</p>
            {filtersActive && <button aria-label="Clear all filters" onClick={clearFilters} className="text-sm font-bold underline underline-offset-4" style={{ color: "var(--accent)" }}>Clear filters ✕</button>}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center" style={{ borderRadius: 20 }}>
            <p className="font-display text-2xl font-black">Is combination mein kuch nahi mila</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--dim)]">Colour, size ya price thora change karke dekho — ya filters saaf karke poori collection dekho.</p>
            <button aria-label="Reset filters and show everything" onClick={clearFilters} className="mt-5 rounded-full px-6 py-3 text-sm font-bold text-white" style={{ background: "var(--accent)" }}>Show Everything</button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
            {filtered.map((p, i) => <ProductCard key={p.slug} p={p} delay={(i % 3) * 80} onView={openProduct} onAdd={quickAdd} waHref={waLink(p, "M")} />)}
          </div>
        )}
      </section>

      {/* Find Your Size */}
      <section id="sizefinder" className="mt-16 scroll-mt-24 py-12 text-white" style={{ background: "var(--accent2)" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
          <div className="rv">
            <p className="text-xs font-bold tracking-[0.25em] text-white/70">NO MORE SIZE GUESSING</p>
            <h2 className="font-display mt-1 text-4xl font-black tracking-tight md:text-5xl">Find Your Size</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/85">Apna qad aur wazan sliders se set karo — hum tumhein ANDAAZ ka perfect size bata denge. Eastern fitting ke hisaab se calibrated hai.</p>

            <div className="mt-7">
              <div className="flex items-baseline justify-between">
                <label htmlFor="sf-height" className="text-sm font-bold tracking-wide">HEIGHT — QAD</label>
                <span className="font-display text-2xl font-black">{height} <span className="text-sm font-bold">cm</span> <span className="text-sm font-semibold text-white/70">({Math.floor(height / 30.48)}′{Math.round((height / 2.54) % 12)}″)</span></span>
              </div>
              <input id="sf-height" type="range" min={140} max={200} step={1} value={height} onChange={e => setHeight(Number(e.target.value))}
                aria-label="Your height in centimetres" className="size-range mt-2 w-full" style={{ background: "rgba(255,255,255,0.3)" }} />
              <div className="flex justify-between text-[11px] font-semibold text-white/60"><span>140 cm</span><span>200 cm</span></div>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <label htmlFor="sf-weight" className="text-sm font-bold tracking-wide">WEIGHT — WAZAN</label>
                <span className="font-display text-2xl font-black">{weight} <span className="text-sm font-bold">kg</span></span>
              </div>
              <input id="sf-weight" type="range" min={40} max={120} step={1} value={weight} onChange={e => setWeight(Number(e.target.value))}
                aria-label="Your weight in kilograms" className="size-range mt-2 w-full" style={{ background: "rgba(255,255,255,0.3)" }} />
              <div className="flex justify-between text-[11px] font-semibold text-white/60"><span>40 kg</span><span>120 kg</span></div>
            </div>
          </div>

          <div className="rv border border-white/25 bg-white/10 p-6 backdrop-blur md:p-8" style={{ borderRadius: 24, transitionDelay: "120ms" }}>
            <p className="text-xs font-bold tracking-[0.25em] text-white/70">YOUR RECOMMENDED SIZE</p>
            <div className="mt-2 flex items-end gap-4">
              <span className="font-display text-[92px] font-black leading-none" aria-live="polite">{rec.size}</span>
              <div className="pb-2">
                <p className="text-sm font-semibold text-white/80">BMI {rec.bmi.toFixed(1)}</p>
                <p className="text-sm font-semibold text-white/80">{height} cm • {weight} kg</p>
              </div>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-white/90">{rec.note}</p>
            <div className="mt-5 flex gap-2" role="group" aria-label="Size chart">
              {["XS", "S", "M", "L", "XL"].map(s => (
                <span key={s} className="flex-1 rounded-full py-2 text-center text-sm font-black"
                  style={rec.size === s ? { background: "var(--accent)", color: "#fff" } : { background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.75)" }}>{s}</span>
              ))}
            </div>
            <button aria-label={`Shop products in size ${rec.size}`} onClick={() => { setFSize(rec.size); document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }}
              className="mt-6 w-full rounded-full bg-white py-3.5 text-sm font-black" style={{ color: "var(--accent2)" }}>
              Shop Size {rec.size} →
            </button>
            <p className="mt-3 text-center text-xs text-white/70">Phir bhi size na aye? 7-day easy exchange, koi sawal nahi.</p>
          </div>
        </div>
      </section>

      {/* Styled By You — UGC */}
      <section id="styled" className="scroll-mt-24 border-b border-[var(--border)] py-12" style={{ background: "var(--surface2)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <div className="rv text-center">
            <p className="text-xs font-bold tracking-[0.25em]" style={{ color: "var(--accent)" }}>COMMUNITY • UGC</p>
            <h2 className="font-display mt-1 text-4xl font-black tracking-tight md:text-5xl">Styled By <span style={{ color: "var(--accent2)" }}>You</span></h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--dim)]">Models nahi — <b>real customers</b>. Ye looks hamari community ne pehne, photos leen aur #MyAndaaz ke saath share kiye. Kisi look par dil aaye to wahi product aik tap mein order karo.</p>
          </div>

          {home.isPending ? <p className="py-10 text-center text-sm text-[var(--dim)]">Loading community looks…</p> : (
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {ugc.map((post, i) => (
                <article key={post.id} className="rv card-lift overflow-hidden border border-[var(--border)] bg-[var(--surface)]" style={{ borderRadius: 18, transitionDelay: `${(i % 4) * 70}ms` }}>
                  <div className="relative overflow-hidden">
                    <img src={IMG[post.imageKey] ?? ugc1} alt={`${post.name} wearing ${post.productName}`} className="zoom aspect-[4/5] w-full object-cover" loading="lazy" />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">{post.city || "Pakistan"}</span>
                    <button aria-label={`Like ${post.name}'s look`} disabled={liked.has(post.id)}
                      onClick={() => { setLiked(s => new Set(s).add(post.id)); likeMut.mutate(post.id); }}
                      className="absolute bottom-2.5 right-2.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-black shadow">
                      {liked.has(post.id) ? "♥" : "♡"} {post.likes}
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-[13px] font-bold">{post.name}</p>
                      <Stars n={post.rating} size={11} />
                    </div>
                    <p className="text-[11px] text-[var(--dim)]">{post.handle} • wearing <b className="text-[var(--text)]">{post.productName}</b></p>
                    <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-[var(--dim)]">{post.caption}</p>
                    {PRODUCTS.find(p => p.slug === post.productSlug) && (
                      <button aria-label={`Shop the look: ${post.productName}`}
                        onClick={() => { const pr = PRODUCTS.find(p => p.slug === post.productSlug); if (pr) openProduct(pr); }}
                        className="mt-2.5 w-full rounded-full border py-2 text-[12px] font-bold" style={{ borderColor: "var(--accent2)", color: "var(--accent2)" }}>
                        Shop This Look — {fmt(PRODUCTS.find(p => p.slug === post.productSlug)!.price)}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="mt-6 text-center text-sm">Apna look yahan dekhna hai? <a href="#share" className="font-bold underline" style={{ color: "var(--accent)" }}>Neeche share karo →</a></p>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-12">
        <div className="rv">
          <p className="text-xs font-bold tracking-[0.25em]" style={{ color: "var(--accent)" }}>REVIEWS</p>
          <h2 className="font-display mt-1 text-4xl font-black tracking-tight">Log Kya Kehte Hain</h2>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {reviews.map((r, i) => (
            <blockquote key={r.id} className="rv border border-[var(--border)] bg-[var(--surface)] p-5" style={{ borderRadius: 18, transitionDelay: `${i * 80}ms` }}>
              <Stars n={r.rating} size={16} />
              <p className="mt-2 text-[15px] leading-relaxed">“{r.caption.length > 140 ? r.caption.slice(0, 140) + "…" : r.caption}”</p>
              <footer className="mt-3 text-sm font-bold">{r.name} <span className="font-normal text-[var(--dim)]">• {r.city} • shared in Styled By You</span></footer>
            </blockquote>
          ))}
          {reviews.length === 0 && !home.isPending && (
            <p className="text-sm text-[var(--dim)] md:col-span-3">Abhi tak koi review share nahi hua — pehla look tum share karo, yahan feature hoga.</p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[["COD Nationwide", "Cash on delivery, har sheher mein"], ["Premium Fabric", "Season ke hisaab se best kapra"], ["7-Day Exchange", "Size na aye to asaan tabdeeli"]].map(([t, d], i) => (
            <div key={t} className="rv border border-[var(--border)] bg-[var(--surface)] p-4" style={{ borderRadius: 18, transitionDelay: `${i * 80}ms` }}>
              <p className="mx-auto h-2.5 w-10 rounded-full" style={{ background: i === 1 ? "var(--accent2)" : "var(--accent)" }} />
              <p className="mt-2.5 text-sm font-bold">{t}</p><p className="mt-0.5 text-xs text-[var(--dim)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Share your look */}
      <section id="share" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14">
        <div className="rv overflow-hidden border border-[var(--border)] md:grid md:grid-cols-2" style={{ borderRadius: 26, background: "var(--surface)" }}>
          <div className="relative min-h-[260px]">
            <img src={ugc3} alt="Customer wearing ANDAAZ at a wedding" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 text-white" style={{ background: "linear-gradient(to top, rgba(10,32,30,0.88), transparent 60%)" }}>
              <p className="font-display text-3xl font-black leading-tight">Tumhari Bari!<br /><span style={{ color: "var(--accent)" }}>Get Featured.</span></p>
              <p className="mt-1 max-w-xs text-sm text-white/85">Best look har Friday hamari hero gallery mein feature hota hai — aur winner ko next order par <b>20% off</b> milta hai.</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="p-6 md:p-8" aria-label="Share your look form">
            <h3 className="font-display text-2xl font-black">Share Your Look</h3>
            {submitted && <p className="mt-3 rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ background: "#1FA855" }}>Shukriya! Tumhara look upar gallery mein live ho gaya hai. Kuch aur share karna hai? Dobara bhar do.</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div><label htmlFor="f-name" className="text-xs font-bold tracking-wide">YOUR NAME *</label>
                <input id="f-name" aria-label="Your name" value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g. Ayesha Khan" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm" required /></div>
              <div><label htmlFor="f-city" className="text-xs font-bold tracking-wide">CITY</label>
                <input id="f-city" aria-label="Your city" value={fCity} onChange={e => setFCity(e.target.value)} placeholder="e.g. Karachi" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm" /></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><label htmlFor="f-handle" className="text-xs font-bold tracking-wide">INSTAGRAM HANDLE</label>
                <input id="f-handle" aria-label="Instagram handle" value={fHandle} onChange={e => setFHandle(e.target.value)} placeholder="@your.handle" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm" /></div>
              <div><label htmlFor="f-product" className="text-xs font-bold tracking-wide">WHAT ARE YOU WEARING?</label>
                <select id="f-product" aria-label="Product you are wearing" value={fProduct} onChange={e => setFProduct(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm">
                  {PRODUCTS.map(p => <option key={p.slug} value={p.name}>{p.name}</option>)}
                  <option value="Eid Family Edit">Eid Family Edit</option>
                </select></div>
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold tracking-wide">PICK YOUR PHOTO STYLE</span>
              <div className="mt-1.5 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Photo style">
                {["ugc-1", "ugc-2", "ugc-3", "ugc-4"].map(k => (
                  <button type="button" key={k} role="radio" aria-checked={fImage === k} aria-label={`Photo style ${k}`} onClick={() => setFImage(k)}
                    className="overflow-hidden rounded-xl border-2" style={{ borderColor: fImage === k ? "var(--accent)" : "transparent" }}>
                    <img src={IMG[k]} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-[var(--dim)]">Abhi ke liye in styles mein se ek chuno — apni asli photo Instagram par #MyAndaaz tag karke bhi feature ho sakti hai.</p>
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold tracking-wide">YOUR RATING</span>
              <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Your rating">
                {[1, 2, 3, 4, 5].map(n => (
                  <button type="button" key={n} role="radio" aria-checked={fRating === n} aria-label={`${n} stars`} onClick={() => setFRating(n)} style={{ fontSize: 26, color: n <= fRating ? "#FF5A1F" : "var(--border)" }}>★</button>
                ))}
              </div>
            </div>
            <div className="mt-2"><label htmlFor="f-caption" className="text-xs font-bold tracking-wide">YOUR REVIEW / CAPTION *</label>
              <textarea id="f-caption" aria-label="Your review or caption" value={fCaption} onChange={e => setFCaption(e.target.value)} rows={3} placeholder="Kaisa laga outfit? Fabric, fitting, compliments — sab batao…" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm" required /></div>
            <button type="submit" disabled={submitMut.isPending} aria-label="Publish my look" className="mt-4 w-full rounded-full py-3.5 text-sm font-black tracking-wide text-white disabled:opacity-50" style={{ background: "var(--accent)" }}>
              {submitMut.isPending ? "Publishing…" : "PUBLISH MY LOOK →"}
            </button>
          </form>
        </div>
      </section>

      {/* Footer / owner setup */}
      <footer className="text-white" style={{ background: "#0E2A28" }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <p className="font-display text-3xl font-black tracking-[0.14em]">ANDAAZ<span style={{ color: "var(--accent)" }}>.</span></p>
            <p className="mt-2 max-w-xs text-sm text-white/70">Apna andaaz, apni pehchan. Pakistani eastern wear, community ke saath — aur community ke liye.</p>
            <p className="mt-3 text-sm text-white/70">Karachi, Pakistan • Delivery nationwide<br />Mon–Sat, 10am–8pm PKT</p>
          </div>
          <div className="text-sm">
            <p className="font-bold tracking-wider">EXPLORE</p>
            <ul className="mt-2 space-y-1.5 text-white/75">
              <li><a href="#shop" className="underline-offset-2 hover:underline">Shop the Drop</a></li>
              <li><a href="#favourites" className="underline-offset-2 hover:underline">Your New Favourites</a></li>
              <li><a href="#sizefinder" className="underline-offset-2 hover:underline">Find Your Size</a></li>
              <li><a href="#styled" className="underline-offset-2 hover:underline">Styled By You</a></li>
              <li><a href="#share" className="underline-offset-2 hover:underline">Share Your Look — win 20% off</a></li>
            </ul>
          </div>
          <div>
            <p className="font-bold tracking-wider">BRAND OWNER — WHATSAPP ORDERS</p>
            <p className="mt-2 text-sm text-white/70">Apna WhatsApp number lagao, saare Order buttons seedha tumhare number par jayenge.</p>
            <div className="mt-3 flex gap-2">
              <input aria-label="WhatsApp number for orders" value={waInput} onChange={e => setWaInput(e.target.value)} placeholder={whatsappSaved ? `Saved: ${whatsappSaved}` : "923001234567"} className="w-full rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm placeholder:text-white/40" />
              <button aria-label="Save WhatsApp number" onClick={() => waInput.trim() && waMut.mutate(waInput)} className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: "var(--accent)" }}>Save</button>
            </div>
            {whatsappSaved && <p className="mt-2 text-xs" style={{ color: "#7EE2A0" }}>✓ Live — orders are going to +{whatsappSaved}</p>}
          </div>
        </div>
        <p className="border-t border-white/15 py-4 text-center text-xs text-white/50">© 2026 ANDAAZ • Made in Pakistan • #MyAndaaz</p>
      </footer>

      {/* Product detail modal */}
      {selected && (
        <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={selected.name}>
          <div className="sheet-up max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-[var(--surface)] md:grid md:grid-cols-2" style={{ borderRadius: "24px 24px 0 0" }}>
            <img src={IMG[selected.img]} alt={selected.name} className="h-72 w-full object-cover object-top md:h-full" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {selected.tag && <span className="rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider text-white" style={{ background: selected.tag === "SALE" ? "#C62828" : "var(--accent)" }}>{selected.tag}</span>}
                  <h3 className="font-display mt-2 text-3xl font-black leading-tight tracking-tight">{selected.name}</h3>
                  <p className="text-sm text-[var(--dim)]">{selected.cat} Collection • <span style={{ color: "var(--accent2)" }}>{selected.urdu}</span></p>
                </div>
                <button aria-label="Close product view" onClick={() => setSelected(null)} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-lg leading-none">✕</button>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black">{fmt(selected.price)}</span>
                {selected.old && <span className="text-[var(--dim)] line-through">{fmt(selected.old)}</span>}
                {selected.old && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "#C62828" }}>-{Math.round((1 - selected.price / selected.old) * 100)}%</span>}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]">{selected.desc}</p>

              <p className="mt-5 text-xs font-bold tracking-wide">COLOUR — <span style={{ color: "var(--accent2)" }}>{selColor}</span></p>
              <div className="mt-2 flex gap-2.5" role="radiogroup" aria-label="Select colour">
                {selected.swatches.map(s => (
                  <button key={s.name} role="radio" aria-checked={selColor === s.name} aria-label={`Colour ${s.name}`} title={s.name} onClick={() => setSelColor(s.name)}
                    className="h-10 w-10 rounded-full border border-black/15"
                    style={{ background: s.hex, boxShadow: selColor === s.name ? "0 0 0 2px var(--surface), 0 0 0 4.5px var(--accent)" : undefined }} />
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-bold tracking-wide">SELECT SIZE</p>
                <button aria-label="Open size finder" onClick={() => { setSelected(null); setTimeout(() => document.getElementById("sizefinder")?.scrollIntoView({ behavior: "smooth" }), 60); }} className="text-xs font-bold underline underline-offset-2" style={{ color: "var(--accent2)" }}>Not sure? Find your size</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Select size">
                {selected.sizes.map(s => (
                  <button key={s} aria-label={`Size ${s}`} aria-pressed={selSize === s} onClick={() => setSelSize(s)} className="h-11 min-w-11 rounded-full border px-2.5 text-sm font-bold" style={selSize === s ? { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" } : { borderColor: "var(--border)" }}>{s}</button>
                ))}
                {rec.size === selSize && <span className="self-center rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: "var(--accent2)" }}>Recommended for you</span>}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <p className="text-xs font-bold tracking-wide">QTY</p>
                <div className="flex items-center gap-1 rounded-full border border-[var(--border)] px-1.5 py-1">
                  <button aria-label="Decrease quantity" onClick={() => setSelQty(q => Math.max(1, q - 1))} className="h-8 w-8 rounded-full text-base font-black">−</button>
                  <span className="w-6 text-center text-sm font-black" aria-live="polite">{selQty}</span>
                  <button aria-label="Increase quantity" onClick={() => setSelQty(q => Math.min(9, q + 1))} className="h-8 w-8 rounded-full text-base font-black">+</button>
                </div>
              </div>

              <div className="mt-6 grid gap-2">
                <button aria-label={`Add ${selected.name} size ${selSize} to bag`} onClick={() => { addToBag(selected, selSize, selColor, selQty); setSelected(null); }} className="w-full rounded-full py-3.5 text-sm font-bold text-white" style={{ background: "var(--accent)" }}>Add to Bag — {fmt(selected.price * selQty)}</button>
                <a aria-label={`Order ${selected.name} on WhatsApp`} href={waLink(selected)} target="_blank" rel="noreferrer" className="w-full rounded-full py-3.5 text-center text-sm font-bold text-white" style={{ background: "#1FA855" }}>Order on WhatsApp</a>
              </div>
              <p className="mt-3 text-center text-xs text-[var(--dim)]">COD available • 7-day easy exchange • Free delivery over Rs 5,000</p>
            </div>
          </div>
        </div>
      )}

      {/* Bag drawer */}
      {showBag && (
        <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Shopping bag">
          <div className="sheet-up max-h-[90vh] w-full max-w-md overflow-y-auto bg-[var(--surface)] p-6" style={{ borderRadius: "24px 24px 0 0" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-black">Your Bag {cartCount > 0 && <span className="text-base font-bold" style={{ color: "var(--accent)" }}>({cartCount})</span>}</h3>
              <button aria-label="Close bag" onClick={() => setShowBag(false)} className="rounded-full border border-[var(--border)] px-3 py-1.5 leading-none">✕</button>
            </div>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--dim)]">Bag khaali hai — kuch pasand karo, andaaz banao!</p>
            ) : (
              <>
                <ul className="mt-4 space-y-3">
                  {cart.map((l, i) => { const p = PRODUCTS.find(x => x.slug === l.slug)!; return (
                    <li key={`${l.slug}-${l.size}-${l.color}`} className="flex items-center gap-3">
                      <img src={IMG[p.img]} alt="" className="h-16 w-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-bold leading-snug">{p.name}</p>
                        <p className="text-xs text-[var(--dim)]">Size {l.size} • {l.color} • {fmt(p.price)}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <button aria-label={`Decrease quantity of ${p.name}`} onClick={() => setCart(prev => prev.map((x, j) => j === i ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="h-6 w-6 rounded-full border border-[var(--border)] text-xs font-black">−</button>
                          <span className="text-xs font-black">{l.qty}</span>
                          <button aria-label={`Increase quantity of ${p.name}`} onClick={() => setCart(prev => prev.map((x, j) => j === i ? { ...x, qty: Math.min(9, x.qty + 1) } : x))} className="h-6 w-6 rounded-full border border-[var(--border)] text-xs font-black">+</button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">{fmt(p.price * l.qty)}</p>
                        <button aria-label={`Remove ${p.name} from bag`} onClick={() => setCart(prev => prev.filter((_, j) => j !== i))} className="mt-1 text-xs font-semibold underline underline-offset-2" style={{ color: "#C62828" }}>Remove</button>
                      </div>
                    </li> ); })}
                </ul>
                <div className="mt-5 flex justify-between border-t border-[var(--border)] pt-4 text-base font-black"><span>Total</span><span>{fmt(cartTotal)}</span></div>
                <p className="mt-1 text-xs text-[var(--dim)]">{cartTotal >= 5000 ? "Free delivery unlocked!" : `Add ${fmt(5000 - cartTotal)} more for free delivery`}</p>
                <a aria-label="Checkout on WhatsApp" href={waCheckoutLink()} target="_blank" rel="noreferrer" className="mt-4 block w-full rounded-full py-3.5 text-center text-sm font-bold text-white" style={{ background: "#1FA855" }}>Checkout on WhatsApp</a>
                <button aria-label="Continue shopping" onClick={() => setShowBag(false)} className="mt-2 w-full rounded-full border border-[var(--border)] py-3 text-sm font-bold">Continue Shopping</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cart notification */}
      {cartNote && (
        <div role="status" className="note-in fixed bottom-24 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl md:bottom-6" style={{ background: "#0E2A28" }}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black" style={{ background: "var(--accent2)" }}>✓</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Added to bag — {cartNote.name}</p>
            <p className="text-xs text-white/70">Size {cartNote.size} • {cartNote.color}</p>
          </div>
          <button aria-label="View bag" onClick={() => { setCartNote(null); setShowBag(true); }} className="shrink-0 rounded-full px-4 py-2 text-xs font-black text-white" style={{ background: "var(--accent)" }}>VIEW BAG</button>
        </div>
      )}

      {toast && <div role="status" className="note-in fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl" style={{ background: "#0E2A28" }}>{toast}</div>}

      {/* Mobile quick nav */}
      <a href="#share" aria-label="Share your look" className="fixed bottom-5 right-4 z-40 rounded-full px-5 py-3 text-sm font-black text-white shadow-xl md:hidden" style={{ background: "var(--accent)" }}>Share Look</a>
    </div>
  );
}
