import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, X, Minus, Plus, MapPin, Leaf, Truck, MessageCircle, Instagram, Star } from "lucide-react";
import { CartProvider, useCart } from "@/lib/cart";
import { brl, buildOrderMessage, cartTotal, whatsappLink, type Category, type Customer, type Product } from "@/lib/store";
import { media, useSiteData, defaultContent, type SiteContent } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";
import { createContext, useContext, type CSSProperties } from "react";

const SiteCtx = createContext<SiteContent>(defaultContent);
const useSite = () => useContext(SiteCtx);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flora Pura Poços de Caldas | Skincare, Cabelo, Óleos e Perfumaria" },
      { name: "description", content: "Loja Flora Pura em Poços de Caldas: skincare, cabelo, óleos essenciais, perfumaria e linha vegana. Peça pelo WhatsApp." },
      { property: "og:title", content: "Flora Pura | Poços de Caldas" },
      { property: "og:description", content: "A essência pura da natureza para sua pele e casa. Peça pelo WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <CartProvider>
      <Store />
    </CartProvider>
  ),
});

function Store() {
  const { data } = useSiteData();
  const site = data!.content;
  const categories = data!.categories;
  const products = data!.products;
  const { count, setOpen } = useCart();
  useEffect(() => { supabase.from("page_views").insert({ path: "/" }).then(() => {}); }, []);
  const colorVars = Object.fromEntries(
    Object.entries(site.colors).filter(([, v]) => v).map(([k, v]) => [`--${k}`, v]),
  ) as CSSProperties;
  const wa = (t: string) => whatsappLink(t, site.whatsapp);
  const [cat, setCat] = useState<Category | "todos">("todos");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [sort, setSort] = useState<"destaque" | "menor" | "maior" | "az">("destaque");

  const list = useMemo(() => {
    const f = products.filter((p) => (cat === "todos" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
    if (sort === "menor") return [...f].sort((a, b) => a.price - b.price);
    if (sort === "maior") return [...f].sort((a, b) => b.price - a.price);
    if (sort === "az") return [...f].sort((a, b) => a.name.localeCompare(b.name));
    return [...f].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  }, [cat, q, sort, products]);

  const goCatalog = (c: Category | "todos") => {
    setCat(c);
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <SiteCtx.Provider value={site}>
    <div style={colorVars} className="min-h-screen bg-background text-foreground pb-24 md:pb-0">
      <div className="bg-primary py-2 text-center text-xs font-semibold tracking-wide text-primary-foreground">
        {site.topbar}
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-3">
          <button aria-label="Buscar" onClick={() => setSearchOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
            <Search className="h-5 w-5" />
          </button>
          <a href="#" className="text-center leading-none">
            <span className="block font-display text-2xl font-semibold tracking-tight text-primary">{site.storeName}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{site.storeTagline}</span>
          </a>
          <button aria-label="Carrinho" onClick={() => setOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-muted">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">{count}</span>
            )}
          </button>
        </div>
        {searchOpen && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <input
              autoFocus value={q}
              onChange={(e) => { setQ(e.target.value); setCat("todos"); }}
              onKeyDown={(e) => e.key === "Enter" && goCatalog("todos")}
              placeholder="Buscar produtos..."
              className="w-full rounded-full border border-input bg-card px-5 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative">
        <img src={media(site.heroImage)} alt={site.heroTitle} width={1280} height={1280} className="h-[78vh] max-h-[720px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-6 pb-10 text-center text-primary-foreground md:text-left">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">{site.heroBadge}</span>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] md:text-7xl whitespace-pre-line">{site.heroTitle}</h1>
          <p className="mx-auto mt-3 max-w-md text-base opacity-90 md:mx-0">{site.heroText}</p>
          <button onClick={() => { const hp = products.find((p) => p.id === site.heroProductId); if (hp) setDetail(hp); else goCatalog("todos"); }} className="mt-6 w-full rounded-full bg-primary-foreground px-8 py-4 font-semibold text-foreground shadow-lg transition active:scale-95 md:w-auto">
            {site.heroButton}
          </button>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto grid max-w-6xl grid-cols-3 gap-2 px-4 py-6 text-center text-xs md:text-sm">
        {site.benefits.slice(0, 3).map(({ t, s }, idx) => { const I = [MessageCircle, Truck, Leaf][idx] ?? Leaf; return (
          <div key={t} className="flex flex-col items-center gap-1">
            <I className="h-6 w-6 text-primary" />
            <span className="font-semibold">{t}</span>
            <span className="text-muted-foreground">{s}</span>
          </div>
        ); })}
      </section>

      {/* Categories */}
      <section className="py-6">
        <h2 className="px-4 text-center text-3xl font-semibold">{site.categoriesTitle}</h2>
        <div className="mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:justify-center">
          {categories.map((c) => (
            <button key={c.id} onClick={() => goCatalog(c.id as Category)} className="flex w-24 shrink-0 snap-center flex-col items-center gap-2 md:w-32">
              <img src={c.image} alt={c.label} loading="lazy" className="aspect-square w-full rounded-full object-cover ring-2 ring-border transition hover:ring-primary" />
              <span className="text-center text-sm font-semibold leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Launch banner */}
      <section className="mx-auto my-8 max-w-6xl md:px-4">
        <div className="grid overflow-hidden bg-accent/25 md:grid-cols-2 md:rounded-3xl">
          <video key={site.bannerVideo} src={media(site.bannerVideo) || undefined} poster={media(site.bannerImage)} autoPlay muted loop playsInline className="aspect-square w-full object-cover md:aspect-auto md:h-full" />
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-4xl font-semibold">{site.bannerTitle}</h2>
            <p className="max-w-sm text-muted-foreground">{site.bannerText}</p>
            <button onClick={() => goCatalog(site.bannerCategory as Category)} className="w-full rounded-full bg-foreground px-8 py-4 font-semibold text-background md:w-auto">{site.bannerButton}</button>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalogo" className="mx-auto max-w-6xl scroll-mt-20 py-6">
        <h2 className="px-4 text-center text-3xl font-semibold">{site.catalogTitle}</h2>
        <div className="sticky top-[68px] z-20 mt-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur [scrollbar-width:none] md:justify-center">
          {[{ id: "todos" as const, label: "Todos" }, ...categories].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id as Category | "todos")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {c.label}
            </button>
          ))}
        </div>
        {q && <p className="px-4 text-center text-sm text-muted-foreground">Resultados para “{q}” <button className="underline" onClick={() => setQ("")}>limpar</button></p>}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 text-sm">
          <span className="text-muted-foreground">{list.length} produto{list.length === 1 ? "" : "s"}</span>
          <select aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-full bg-muted px-4 py-2 font-semibold outline-none">
            <option value="destaque">Destaques</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
            <option value="az">A–Z</option>
          </select>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-8 px-3 md:grid-cols-4 md:gap-6 md:px-4">
          {list.map((p) => <ProductCard key={p.id} p={p} onOpen={() => setDetail(p)} />)}
          {list.length === 0 && <p className="col-span-full py-10 text-center text-muted-foreground">Nenhum produto encontrado.</p>}
        </div>
      </section>

      {/* How to buy */}
      <section className="px-4 py-14 text-center">
        <h2 className="text-3xl font-semibold">{site.howTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{site.howSubtitle}</p>
        <ol className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-3">
          {site.steps.map(({ t, s }, i) => [String(i + 1), t, s]).map(([n, t, s]) => (
            <li key={n} className="flex flex-col items-center gap-2">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary font-display text-xl font-semibold text-primary-foreground">{n}</span>
              <span className="font-semibold">{t}</span>
              <span className="max-w-xs text-sm text-muted-foreground">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* About */}
      <section className="bg-accent/20 px-5 py-8 text-center">
        <h2 className="text-xl font-semibold md:text-2xl">{site.aboutTitle}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{site.aboutText}</p>
        <div className="mx-auto mt-4 grid max-w-2xl grid-cols-3 gap-3">
          {site.stats.map(({ a, b }) => (
            <div key={b}><p className="font-display text-lg font-semibold text-primary">{a}</p><p className="text-[11px] text-muted-foreground">{b}</p></div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-secondary py-7">
        <h2 className="px-4 text-center text-xl font-semibold md:text-2xl">{site.reviewsTitle}</h2>
        <div className="mx-auto mt-4 flex max-w-6xl snap-x gap-3 overflow-x-auto px-4 [scrollbar-width:none]">
          {site.reviews.map(({ n, t }) => (
            <figure key={n + t} className="w-[75%] shrink-0 snap-center rounded-2xl bg-card p-4 text-center md:w-1/3">
              <div className="flex justify-center gap-0.5 text-accent">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}</div>
              <blockquote className="mt-2 text-xs">“{t}”</blockquote>
              <figcaption className="mt-2 text-xs font-semibold">{n}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="text-center text-xl font-semibold md:text-2xl">{site.faqTitle}</h2>
        <div className="mt-4 space-y-2">
          {site.faq.map(({ q: q2, a }) => (
            <details key={q2} className="group rounded-xl bg-muted px-4 py-2.5">
              <summary className="cursor-pointer list-none text-center text-sm font-semibold">{q2}</summary>
              <p className="mt-1.5 text-center text-xs text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary px-5 py-7 text-center text-primary-foreground">
        <p className="font-display text-xl font-semibold">{site.storeName}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs opacity-90">{site.footerText}</p>
        <a href={`https://maps.google.com/?q=${encodeURIComponent(site.address)}`} target="_blank" rel="noreferrer" className="mx-auto mt-3 flex max-w-xs items-start justify-center gap-1.5 text-xs">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {site.address}
        </a>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <a href={wa("Olá! Gostaria de mais informações.")} target="_blank" rel="noreferrer" className="rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-whatsapp-foreground">Falar no WhatsApp</a>
          <a href={`https://www.instagram.com/${site.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-primary-foreground/40 px-4 py-2 text-sm font-semibold"><Instagram className="h-3.5 w-3.5" /> @{site.instagram}</a>
        </div>
        <p className="mt-4 text-[11px] opacity-70">© {new Date().getFullYear()} {site.storeName}</p>
      </footer>

      {/* Floating cart bar (mobile) */}
      <MobileBar />
      <a href={wa("Olá!")} target="_blank" rel="noreferrer" aria-label="WhatsApp"
        className={`fixed right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-xl transition active:scale-95 md:bottom-6 md:right-6 md:h-14 md:w-14 ${count ? "bottom-24" : "bottom-5"}`}>
        <WhatsIcon className="h-6 w-6 md:h-7 md:w-7" />
      </a>

      <ProductSheet p={detail} onClose={() => setDetail(null)} />
      <CartDrawer />
    </div>
    </SiteCtx.Provider>
  );
}

function ProductCard({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const { add } = useCart();
  const out = p.stock === 0;
  return (
    <article className="flex flex-col text-center">
      <button onClick={onOpen} className="relative overflow-hidden rounded-2xl bg-muted">
        <img src={p.image} alt={p.name} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-500 hover:scale-105" />
        {p.video && <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold">▶ Vídeo</span>}
        {p.badge && <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">{p.badge}</span>}
      </button>
      <button onClick={onOpen} className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-tight">{p.name}</button>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        {p.oldPrice && <span className="text-xs text-muted-foreground line-through">{brl(p.oldPrice)}</span>}
        <span className="font-bold">{brl(p.price)}</span>
      </div>
      <span className="text-[11px] text-muted-foreground">ou {brl(p.price / 3)} em 3x</span>
      <StockTag stock={p.stock} />
      <button disabled={out} onClick={() => add(p)} className="mt-3 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-50">
        {out ? "Esgotado" : "Adicionar"}
      </button>
    </article>
  );
}

function ProductSheet({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [idx, setIdx] = useState(0);
  useEffect(() => { setQty(1); setIdx(0); }, [p]);
  const gallery = p ? [...(p.images?.length ? p.images : [p.image]).map((src) => ({ src, v: false })), ...(p.video ? [{ src: p.video, v: true }] : [])] : [];
  const cur = gallery[idx] ?? gallery[0];
  const max = p?.stock ?? 999;
  return (
    <Overlay open={!!p} onClose={onClose} side="bottom">
      {p && (
        <div className="flex flex-col">
          {cur?.v
            ? <video key={cur.src} src={cur.src} autoPlay muted loop playsInline controls className="aspect-square w-full bg-muted object-cover md:aspect-[4/3]" />
            : <img src={cur?.src} alt={p.name} className="aspect-square w-full object-cover md:aspect-[4/3]" />}
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
              {gallery.map((g, i) => (
                <button key={i} aria-label={`Mídia ${i + 1}`} onClick={() => setIdx(i)} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ${i === idx ? "ring-primary" : "ring-transparent"}`}>
                  {g.v ? <><video src={g.src} muted className="h-full w-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-foreground/30 text-xs font-bold text-background">▶</span></> : <img src={g.src} alt="" className="h-full w-full object-cover" />}
                </button>
              ))}
            </div>
          )}
          <div className="p-6 text-center">
            {p.badge && <span className="text-xs font-bold uppercase tracking-wider text-primary">{p.badge}</span>}
            <h3 className="mt-1 text-2xl font-semibold">{p.name}</h3>
            <div className="mt-2 flex items-baseline justify-center gap-2">
              {p.oldPrice && <span className="text-sm text-muted-foreground line-through">{brl(p.oldPrice)}</span>}
              <span className="text-2xl font-bold">{brl(p.price)}</span>
            </div>
            <StockTag stock={p.stock} />
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{p.description}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Qty qty={qty} setQty={(n) => setQty(Math.max(1, Math.min(max, n)))} />
              <button disabled={p.stock === 0} onClick={() => { add(p, qty); onClose(); }} className="flex-1 disabled:opacity-50 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground active:scale-95">
                {p.stock === 0 ? "Esgotado" : `Adicionar • ${brl(p.price * qty)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Overlay>
  );
}

function CartDrawer() {
  const { lines, open, setOpen, setQty, clear } = useCart();
  const site = useSite();
  const payments = site.payments.split(",").map((x) => x.trim()).filter(Boolean);
  const [c, setC] = useState<Customer>({ name: "", phone: "", delivery: "entrega", address: "", payment: "Pix", notes: "" });
  const total = cartTotal(lines);
  const phoneOk = (c.phone ?? "").replace(/\D/g, "").length >= 10;
  const valid = c.name.trim() && phoneOk && (c.delivery === "retirada" || c.address.trim());
  const input = "w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

  const send = () => {
    window.open(whatsappLink(buildOrderMessage(lines, c, site.address), site.whatsapp), "_blank");
    supabase.rpc("place_order", { _items: lines.map((l) => ({ id: l.product.id, qty: l.qty })), _customer: c }).then(() => {});
    clear();
    setOpen(false);
  };

  return (
    <Overlay open={open} onClose={() => setOpen(false)} side="right">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-xl font-semibold">Sua sacola</h3>
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10" />
            <p>Sua sacola está vazia.</p>
            <button onClick={() => setOpen(false)} className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Ver produtos</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {lines.map((l) => (
                <div key={l.product.id} className="flex gap-3">
                  <img src={l.product.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <p className="line-clamp-2 text-sm font-medium">{l.product.name}</p>
                    <div className="flex items-center justify-between">
                      <Qty qty={l.qty} setQty={(n) => setQty(l.product.id, n)} small />
                      <span className="text-sm font-bold">{brl(l.product.price * l.qty)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="space-y-3 border-t border-border pt-5">
                <p className="text-sm font-semibold">Dados para o pedido</p>
                <label className="block space-y-1"><span className="text-sm font-semibold">Seu nome</span>
                  <input className={input} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></label>
                <label className="block space-y-1"><span className="text-sm font-semibold">Telefone / WhatsApp</span>
                  <input className={input} type="tel" inputMode="tel" placeholder="(35) 9...." value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></label>
                <div className="grid grid-cols-2 gap-2">
                  {(["entrega", "retirada"] as const).map((d) => (
                    <button key={d} onClick={() => setC({ ...c, delivery: d })}
                      className={`rounded-xl py-3 text-sm font-semibold ${c.delivery === d ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {d === "entrega" ? "Entrega" : "Retirar na loja"}
                    </button>
                  ))}
                </div>
                {c.delivery === "entrega" ? (
                  <textarea className={input} rows={2} placeholder="Rua, número, bairro e complemento" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} />
                ) : (
                  <p className="flex gap-2 rounded-xl bg-muted p-3 text-xs"><MapPin className="h-4 w-4 shrink-0" />{site.address}</p>
                )}
                <select className={input} value={c.payment} onChange={(e) => setC({ ...c, payment: e.target.value })}>
                  {payments.map((o) => <option key={o}>{o}</option>)}
                </select>
                <label className="block space-y-1"><span className="text-sm font-semibold">Observações (opcional)</span>
                  <textarea className={input} rows={3} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} /></label>
              </div>
            </div>
            <div className="border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex justify-between text-lg"><span>Subtotal ({lines.reduce((s, l) => s + l.qty, 0)} itens)</span><strong>{brl(total)}</strong></div>
              <button disabled={!valid} onClick={send} className="flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp py-4 font-semibold text-whatsapp-foreground transition active:scale-95 disabled:opacity-50">
                <WhatsIcon className="h-5 w-5" /> Enviar pedido pelo WhatsApp
              </button>
              <button onClick={() => setOpen(false)} className="mt-2 w-full py-2 text-sm text-muted-foreground">Continuar comprando (a sacola fica salva)</button>
              {!valid && <p className="mt-2 text-center text-xs text-muted-foreground">Preencha nome, WhatsApp{c.delivery === "entrega" ? " e endereço" : ""} para finalizar.</p>}
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}

function MobileBar() {
  const { count, lines, setOpen } = useCart();
  if (!count) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px] shadow-foreground/20 backdrop-blur md:hidden">
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-full bg-primary px-6 py-4 font-semibold text-primary-foreground">
        <span className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Ver sacola ({count})</span>
        <span>{brl(cartTotal(lines))}</span>
      </button>
    </div>
  );
}

function Qty({ qty, setQty, small }: { qty: number; setQty: (n: number) => void; small?: boolean }) {
  const b = small ? "h-8 w-8" : "h-12 w-12";
  return (
    <div className="flex items-center rounded-full bg-muted">
      <button aria-label="Diminuir" onClick={() => setQty(qty - 1)} className={`grid ${b} place-items-center`}><Minus className="h-4 w-4" /></button>
      <span className="w-6 text-center text-sm font-semibold">{qty}</span>
      <button aria-label="Aumentar" onClick={() => setQty(qty + 1)} className={`grid ${b} place-items-center`}><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function Overlay({ open, onClose, side, children }: { open: boolean; onClose: () => void; side: "right" | "bottom"; children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  const panel =
    side === "right"
      ? `inset-y-0 right-0 w-full sm:max-w-md ${open ? "translate-x-0" : "translate-x-full"}`
      : `inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:rounded-3xl ${open ? "translate-y-0 md:-translate-y-1/2" : "translate-y-full md:translate-y-[150%]"}`;
  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-foreground/50 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <div className={`fixed z-50 bg-background shadow-2xl transition-transform duration-300 ease-out ${panel}`}>
        {side === "bottom" && (
          <button aria-label="Fechar" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/90"><X className="h-5 w-5" /></button>
        )}
        {children}
      </div>
    </>
  );
}

function StockTag({ stock }: { stock?: number | null | undefined }) {
  if (stock == null) return null;
  if (stock <= 0) return <span className="mt-1 text-[11px] font-semibold text-destructive">Esgotado</span>;
  return <span className={`mt-1 block text-[11px] font-semibold ${stock <= 3 ? "text-destructive" : "text-primary"}`}>{stock <= 3 ? `Últimas ${stock} unidades` : `${stock} em estoque`}</span>;
}

function WhatsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.4 9.4 0 0 1 9.43 9.44c0 5.2-4.24 9.43-9.44 9.43m8.02-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.3 11.3 0 0 0 5.42 1.38h.01c6.25 0 11.34-5.09 11.35-11.34 0-3.03-1.18-5.88-3.33-8.02"/>
    </svg>
  );
}
