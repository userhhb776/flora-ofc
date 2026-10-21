import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { defaultContent, media, uploadMedia, type CategoryRow, type ProductRow, type SiteContent } from "@/lib/site";
import { brl } from "@/lib/store";
import { LogOut, Upload, Trash2, Plus, ExternalLink, LayoutDashboard, ShoppingCart, Package, Tags, Home, Palette, Store, UserCog, Eye, TrendingUp, Wallet, Menu, X, Film, Phone } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel do administrador | Flora Pura" },
      { name: "description", content: "Área restrita para gerenciar a loja Flora Pura." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel Flora Pura" },
      { property: "og:description", content: "Área restrita da loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const btnGhost = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold";

function AdminPage() {
  const [state, setState] = useState<"loading" | "out" | "noadmin" | "in">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setState("out");
      setEmail(data.user.email ?? "");
      const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setState(ok ? "in" : "noadmin");
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT" || e === "USER_UPDATED") check();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
      <Toaster />
      {state === "loading" && <p className="p-10 text-center text-muted-foreground">Carregando…</p>}
      {state === "out" && <Login />}
      {state === "noadmin" && (
        <div className="p-10 text-center">
          <p>Esta conta não tem acesso de administrador.</p>
          <button className={`${btn} mt-4`} onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      )}
      {state === "in" && <Panel email={email} />}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) toast.error("E-mail ou senha incorretos.");
  };
  return (
    <form onSubmit={submit} className="mx-auto mt-20 max-w-sm space-y-3 rounded-2xl bg-card p-6 shadow">
      <h1 className="text-center text-2xl font-semibold">Painel Flora Pura</h1>
      <p className="text-center text-sm text-muted-foreground">Acesso do administrador</p>
      <input className={inputCls} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className={inputCls} type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} required />
      <button className={`${btn} w-full`} disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      <Link to="/" className="block text-center text-xs text-muted-foreground underline">Voltar para a loja</Link>
    </form>
  );
}

const TABS = [
  { id: "geral", label: "Visão geral", icon: LayoutDashboard, group: "Gestão" },
  { id: "pedidos", label: "Pedidos", icon: ShoppingCart, group: "Gestão" },
  { id: "produtos", label: "Produtos", icon: Package, group: "Catálogo" },
  { id: "categorias", label: "Categorias", icon: Tags, group: "Catálogo" },
  { id: "pagina", label: "Página inicial", icon: Home, group: "Site" },
  { id: "aparencia", label: "Aparência", icon: Palette, group: "Site" },
  { id: "loja", label: "Loja", icon: Store, group: "Site" },
  { id: "conta", label: "Conta", icon: UserCog, group: "Site" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const MOBILE_MAIN: Tab[] = ["geral", "pedidos", "produtos"];

function Panel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("geral");
  const [more, setMore] = useState(false);
  const qc = useQueryClient();
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); };
  const current = TABS.find((t) => t.id === tab)!;
  const go = (t: Tab) => { setTab(t); setMore(false); window.scrollTo({ top: 0 }); };
  const groups = ["Gestão", "Catálogo", "Site"];
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card p-4 md:flex">
        <div className="mb-6 px-2">
          <p className="font-display text-xl font-semibold text-primary">Flora Pura</p>
          <p className="text-xs text-muted-foreground">Painel administrativo</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{g}</p>
              {TABS.filter((t) => t.group === g).map((t) => (
                <button key={t.id} onClick={() => go(t.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-border pt-3">
          <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"><ExternalLink className="h-4 w-4" /> Ver loja</a>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground md:hidden">Flora Pura • Painel</p>
            <h1 className="truncate font-sans text-lg font-bold md:text-2xl">{current.label}</h1>
          </div>
          <div className="flex shrink-0 gap-2 md:hidden">
            <a href="/" target="_blank" rel="noreferrer" aria-label="Ver loja" className={btnGhost}><ExternalLink className="h-4 w-4" /></a>
            <button aria-label="Sair" onClick={signOut} className={btnGhost}><LogOut className="h-4 w-4" /></button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-3 md:p-8">
          {tab === "geral" && <Overview go={go} />}
          {tab === "pedidos" && <Orders />}
          {tab === "produtos" && <Products />}
          {tab === "categorias" && <Categories />}
          {(tab === "pagina" || tab === "aparencia" || tab === "loja") && <ContentEditor section={tab} />}
          {tab === "conta" && <Account email={email} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_MAIN.map((id) => { const t = TABS.find((x) => x.id === id)!; return (
          <button key={id} onClick={() => go(id)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${tab === id ? "text-primary" : "text-muted-foreground"}`}>
            <t.icon className="h-5 w-5" /> {t.label === "Visão geral" ? "Início" : t.label}
          </button>
        ); })}
        <button onClick={() => setMore(true)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${!MOBILE_MAIN.includes(tab) ? "text-primary" : "text-muted-foreground"}`}>
          <Menu className="h-5 w-5" /> Mais
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><p className="font-bold">Mais opções</p><button aria-label="Fechar" onClick={() => setMore(false)}><X className="h-5 w-5" /></button></div>
            <div className="grid grid-cols-3 gap-2">
              {TABS.filter((t) => !MOBILE_MAIN.includes(t.id)).map((t) => (
                <button key={t.id} onClick={() => go(t.id)} className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-xs font-semibold ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <t.icon className="h-5 w-5" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
      {(title || right) && <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-sans text-base font-bold">{title}</h2>{right}</div>}
      {children}
    </section>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ go }: { go: (t: Tab) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const day = 86400000, now = Date.now();
      const since = (d: number) => new Date(now - d * day).toISOString();
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const count = async (from?: string) => {
        let q = supabase.from("page_views").select("*", { count: "exact", head: true });
        if (from) q = q.gte("created_at", from);
        return (await q).count ?? 0;
      };
      const [today, week, month, total, orders, views] = await Promise.all([
        count(startToday.toISOString()), count(since(7)), count(since(30)), count(),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("page_views").select("created_at").gte("created_at", since(14)).limit(10000),
      ]);
      const perDay: { d: string; n: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * day); const key = d.toISOString().slice(0, 10);
        perDay.push({ d: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), n: (views.data ?? []).filter((v) => v.created_at.slice(0, 10) === key).length });
      }
      const ord = orders.data ?? [];
      const monthOrders = ord.filter((o) => o.created_at >= since(30));
      const lowStock = ((await supabase.from("products").select("id,name,stock").not("stock", "is", null).lte("stock", 3).order("stock")).data ?? []);
      return { lowStock, newCount: ord.filter((o) => o.status === "novo").length, today, week, month, total, perDay, orders: ord.slice(0, 5), monthCount: monthOrders.length, monthRevenue: monthOrders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + Number(o.total), 0) };
    },
  });
  if (!data) return <p className="text-muted-foreground">Carregando…</p>;
  const max = Math.max(1, ...data.perDay.map((p) => p.n));
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([["Acessos hoje", data.today, Eye, `${data.week} na semana`], ["Acessos (30 dias)", data.month, TrendingUp, `${data.total} no total`], ["Pedidos (30 dias)", data.monthCount, ShoppingCart, `${data.newCount} novos aguardando`], ["Vendas (30 dias)", brl(data.monthRevenue), Wallet, "sem cancelados"]] as const).map(([l, v, I, sub]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted-foreground">{l}</p><span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary"><I className="h-4 w-4" /></span></div>
            <p className="mt-2 text-xl font-bold md:text-2xl">{v}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>
      {data.lowStock.length > 0 && (
        <Card title="Estoque baixo" right={<button className="text-xs font-semibold text-primary underline" onClick={() => go("produtos")}>Ver produtos</button>}>
          <div className="flex flex-wrap gap-2">{data.lowStock.map((p) => <span key={p.id} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.stock === 0 ? "bg-destructive/10 text-destructive" : "bg-accent/20"}`}>{p.name}: {p.stock === 0 ? "esgotado" : `${p.stock} un.`}</span>)}</div>
        </Card>
      )}
      <Card title="Acessos nos últimos 14 dias">
        <div className="flex h-32 items-end gap-1">
          {data.perDay.map((p) => (
            <div key={p.d} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{p.n}</span>
              <div className="w-full rounded-t bg-primary" style={{ height: `${(p.n / max) * 90}px` }} />
              <span className="text-[9px] text-muted-foreground">{p.d}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Pedidos recentes" right={<button className="text-xs font-semibold text-primary underline" onClick={() => go("pedidos")}>Ver todos</button>}>
        {data.orders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p> :
          data.orders.map((o) => <OrderRow key={o.id} o={o as OrderT} />)}
      </Card>
    </>
  );
}

/* ---------------- Orders ---------------- */
type OrderT = { id: string; created_at: string; customer: { name?: string; phone?: string; delivery?: string; address?: string; payment?: string; notes?: string }; items: { name: string; qty: number; price: number }[]; total: number; status: string };
const STATUSES = ["novo", "confirmado", "em preparo", "entregue", "cancelado"];
const statusCls: Record<string, string> = { novo: "bg-accent/25", confirmado: "bg-primary/15 text-primary", "em preparo": "bg-secondary", entregue: "bg-primary text-primary-foreground", cancelado: "bg-destructive/10 text-destructive" };

function OrderRow({ o, onStatus, onDelete }: { o: OrderT; onStatus?: (s: string) => void; onDelete?: () => void }) {
  return (
    <div className="border-b border-border py-3 text-sm last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{o.customer?.name || "Sem nome"} • {brl(Number(o.total))}</p>
          {o.customer?.phone && <a href={`https://wa.me/55${o.customer.phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Phone className="h-3 w-3" /> {o.customer.phone}</a>}
          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")} • {o.customer?.delivery === "retirada" ? "Retirada" : `Entrega: ${o.customer?.address ?? ""}`} • {o.customer?.payment}</p>
        </div>
        {onStatus ? (
          <div className="flex gap-2">
            <select className={`${inputCls} w-auto`} value={o.status} onChange={(e) => onStatus(e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <button aria-label="Apagar" onClick={onDelete} className={btnGhost}><Trash2 className="h-4 w-4" /></button>
          </div>
        ) : <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusCls[o.status] ?? "bg-muted"}`}>{o.status}</span>}
      </div>
      <ul className="mt-1 text-xs text-muted-foreground">{(o.items ?? []).map((i, k) => <li key={k}>{i.qty}x {i.name} — {brl(i.price * i.qty)}</li>)}</ul>
      {o.customer?.notes && <p className="mt-1 text-xs">Obs.: {o.customer.notes}</p>}
    </div>
  );
}

function Orders() {
  const [filter, setFilter] = useState("todos");
  const { data, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => ((await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? []) as unknown as OrderT[],
  });
  const qc = useQueryClient();
  const list = (data ?? []).filter((o) => filter === "todos" || o.status === filter);
  return (
    <>
    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
      {["todos", ...STATUSES].map((s) => (
        <button key={s} onClick={() => setFilter(s)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filter === s ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>
          {s} ({s === "todos" ? (data ?? []).length : (data ?? []).filter((o) => o.status === s).length})
        </button>
      ))}
    </div>
    <p className="mb-3 rounded-xl bg-accent/15 p-3 text-xs">Ao marcar um pedido como <b>confirmado</b>, <b>em preparo</b> ou <b>entregue</b>, o estoque dos produtos diminui. Se cancelar ou voltar para novo, o estoque volta.</p>
    <Card title={`Pedidos (${list.length})`}>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido.</p>}
      {list.map((o) => (
        <OrderRow key={o.id} o={o}
          onStatus={async (s) => { const { error } = await supabase.rpc("set_order_status", { _id: o.id, _status: s }); if (error) toast.error(error.message); else toast.success("Status atualizado"); refetch(); qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["site"] }); }}
          onDelete={async () => { if (confirm("Apagar este pedido?")) { await supabase.from("orders").delete().eq("id", o.id); refetch(); } }} />
      ))}
    </Card>
    </>
  );
}

/* ---------------- Media input ---------------- */
function MediaInput({ value, onChange, video }: { value: string; onChange: (v: string) => void; video?: boolean }) {
  const [busy, setBusy] = useState(false);
  const src = media(value);
  return (
    <div className="flex items-start gap-3">
      {src ? (video ? <video src={src} muted className="h-20 w-20 rounded-lg bg-muted object-cover" /> : <img src={src} alt="" className="h-20 w-20 rounded-lg bg-muted object-cover" />)
        : <div className="h-20 w-20 rounded-lg bg-muted" />}
      <div className="flex-1 space-y-2">
        <label className={`${btnGhost} cursor-pointer`}>
          <Upload className="h-4 w-4" /> {busy ? "Enviando…" : video ? "Trocar vídeo" : "Trocar foto"}
          <input type="file" hidden accept={video ? "video/*" : "image/*"} disabled={busy} onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setBusy(true);
            try { onChange(await uploadMedia(f)); toast.success("Arquivo enviado. Lembre de salvar."); }
            catch { toast.error("Não foi possível enviar o arquivo."); }
            setBusy(false);
          }} />
        </label>
        {video && value && <button className="ml-2 text-xs underline" onClick={() => onChange("")}>Remover vídeo (mostrar só a foto)</button>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

/* ---------------- Products ---------------- */
const emptyProduct: ProductRow = { id: "", name: "", category: "", price: 0, old_price: null, image: "", badge: "", description: "", stock: null, featured: false, visible: true, sort: 0, images: [], video: "" };

function Products() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<ProductRow | null>(null);
  const [search, setSearch] = useState("");
  const { data: cats } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => ((await supabase.from("categories").select("*").order("sort")).data ?? []) as CategoryRow[] });
  const { data, refetch } = useQuery({ queryKey: ["admin-products"], queryFn: async () => ((await supabase.from("products").select("*").order("sort")).data ?? []) as ProductRow[] });
  const list = (data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const save = async (p: ProductRow) => {
    const row = { ...p, badge: p.badge || null, old_price: p.old_price || null, images: p.images ?? [], video: p.video ?? "" };
    const { id, ...rest } = row;
    const res = id ? await supabase.from("products").update(rest).eq("id", id) : await supabase.from("products").insert({ ...rest, sort: (data?.length ?? 0) + 1 });
    if (res.error) { toast.error("Erro ao salvar: " + res.error.message); return; }
    toast.success("Produto salvo!"); setEdit(null); refetch(); qc.invalidateQueries({ queryKey: ["site"] });
  };
  const quick = async (id: string, patch: Partial<ProductRow>) => { await supabase.from("products").update(patch).eq("id", id); refetch(); qc.invalidateQueries({ queryKey: ["site"] }); };

  if (edit) return <ProductForm p={edit} cats={cats ?? []} onCancel={() => setEdit(null)} onSave={save} />;
  return (
    <Card title={`Produtos (${list.length})`} right={<button className={btn} onClick={() => setEdit({ ...emptyProduct, category: cats?.[0]?.id ?? "" })}><Plus className="h-4 w-4" /> Novo</button>}>
      <input className={`${inputCls} mb-3`} placeholder="Buscar produto…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <div key={p.id} className={`flex gap-3 rounded-xl border border-border p-3 ${!p.visible ? "opacity-60" : ""}`}>
            <div className="relative shrink-0">
              <img src={media(p.image)} alt="" className="h-20 w-20 rounded-lg object-cover" />
              {(p.images?.length ?? 0) > 0 && <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1 text-[10px] font-bold">+{p.images.length}</span>}
              {p.video && <Film className="absolute right-1 top-1 h-4 w-4 rounded bg-background/90 p-0.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{brl(Number(p.price))} • {cats?.find((c) => c.id === p.category)?.label ?? p.category}</p>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-xs">Estoque:</span>
                <input aria-label="Estoque" type="number" className="w-16 rounded border border-input bg-card px-1.5 py-0.5 text-xs" defaultValue={p.stock ?? ""} placeholder="∞"
                  onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== p.stock) quick(p.id, { stock: v }); }} />
                {p.stock === 0 && <span className="text-[10px] font-bold text-destructive">ESGOTADO</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.featured} onChange={(e) => quick(p.id, { featured: e.target.checked })} /> Destaque</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.visible} onChange={(e) => quick(p.id, { visible: e.target.checked })} /> Visível</label>
                <button className="ml-auto font-semibold text-primary underline" onClick={() => setEdit(p)}>Editar</button>
                <button aria-label="Apagar" className="text-destructive" onClick={async () => { if (confirm(`Apagar "${p.name}"?`)) { await supabase.from("products").delete().eq("id", p.id); refetch(); qc.invalidateQueries({ queryKey: ["site"] }); } }}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProductForm({ p: initial, cats, onCancel, onSave }: { p: ProductRow; cats: CategoryRow[]; onCancel: () => void; onSave: (p: ProductRow) => void }) {
  const [p, setP] = useState(initial);
  const set = <K extends keyof ProductRow>(k: K, v: ProductRow[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <Card title={initial.id ? "Editar produto" : "Novo produto"}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2"><Field label="Fotos (a primeira é a principal)"><Gallery main={p.image} extra={p.images ?? []} onChange={(main, extra) => setP((x) => ({ ...x, image: main, images: extra }))} /></Field></div>
        <div className="md:col-span-2"><Field label="Vídeo do produto (opcional, toca sem som)"><MediaInput video value={p.video ?? ""} onChange={(v) => set("video", v)} /></Field></div>
        <Field label="Nome"><input className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Categoria"><select className={inputCls} value={p.category} onChange={(e) => set("category", e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
        <Field label="Preço (R$)"><input className={inputCls} type="number" step="0.01" value={p.price} onChange={(e) => set("price", Number(e.target.value))} /></Field>
        <Field label="Preço antigo riscado (opcional)"><input className={inputCls} type="number" step="0.01" value={p.old_price ?? ""} onChange={(e) => set("old_price", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Selo (ex.: Lançamento, Oferta)"><input className={inputCls} value={p.badge ?? ""} onChange={(e) => set("badge", e.target.value)} /></Field>
        <Field label="Estoque (vazio = ilimitado)"><input className={inputCls} type="number" value={p.stock ?? ""} onChange={(e) => set("stock", e.target.value === "" ? null : Number(e.target.value))} /></Field>
        <Field label="Ordem (menor aparece primeiro)"><input className={inputCls} type="number" value={p.sort} onChange={(e) => set("sort", Number(e.target.value))} /></Field>
        <div className="flex items-end gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} /> Destaque</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={p.visible} onChange={(e) => set("visible", e.target.checked)} /> Visível na loja</label>
        </div>
        <div className="md:col-span-2"><Field label="Descrição"><textarea className={inputCls} rows={3} value={p.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className={btn} disabled={!p.name} onClick={() => onSave(p)}>Salvar</button>
        <button className={btnGhost} onClick={onCancel}>Cancelar</button>
      </div>
    </Card>
  );
}

function Gallery({ main, extra, onChange }: { main: string; extra: string[]; onChange: (main: string, extra: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const all = [main, ...extra].filter(Boolean);
  const update = (list: string[]) => onChange(list[0] ?? "", list.slice(1));
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((src, i) => (
        <div key={src + i} className={`relative h-24 w-24 overflow-hidden rounded-lg ring-2 ${i === 0 ? "ring-primary" : "ring-border"}`}>
          <img src={media(src)} alt="" className="h-full w-full object-cover" />
          {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">PRINCIPAL</span>}
          <div className="absolute inset-x-0 bottom-0 flex justify-between bg-foreground/60 p-1">
            {i > 0 ? <button className="text-[10px] font-semibold text-background" onClick={() => update([src, ...all.filter((_, k) => k !== i)])}>Principal</button> : <span />}
            <button aria-label="Remover foto" className="text-background" onClick={() => update(all.filter((_, k) => k !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
      <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border text-center text-xs text-muted-foreground">
        <span className="flex flex-col items-center gap-1"><Upload className="h-5 w-5" />{busy ? "Enviando…" : "Adicionar fotos"}</span>
        <input type="file" hidden multiple accept="image/*" disabled={busy} onChange={async (e) => {
          const files = Array.from(e.target.files ?? []); if (!files.length) return;
          setBusy(true);
          try { const urls = await Promise.all(files.map(uploadMedia)); update([...all, ...urls]); toast.success("Fotos enviadas. Lembre de salvar."); }
          catch { toast.error("Não foi possível enviar as fotos."); }
          setBusy(false); e.target.value = "";
        }} />
      </label>
    </div>
  );
}

/* ---------------- Categories ---------------- */
function Categories() {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => ((await supabase.from("categories").select("*").order("sort")).data ?? []) as CategoryRow[] });
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [newLabel, setNewLabel] = useState("");
  useEffect(() => { if (data) setRows(data); }, [data]);
  const update = (i: number, patch: Partial<CategoryRow>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const saveAll = async () => {
    const { error } = await supabase.from("categories").upsert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success("Categorias salvas!"); refetch(); qc.invalidateQueries({ queryKey: ["site"] });
  };
  const add = async () => {
    const id = newLabel.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now()}`;
    const { error } = await supabase.from("categories").insert({ id, label: newLabel, image: "", sort: rows.length + 1 });
    if (error) { toast.error(error.message); return; }
    setNewLabel(""); refetch(); qc.invalidateQueries({ queryKey: ["site"] });
  };
  return (
    <Card title="Categorias" right={<button className={btn} onClick={saveAll}>Salvar tudo</button>}>
      <div className="space-y-4">
        {rows.map((c, i) => (
          <div key={c.id} className="grid items-start gap-3 border-b border-border pb-4 md:grid-cols-[1fr_1fr_100px_auto]">
            <MediaInput value={c.image} onChange={(v) => update(i, { image: v })} />
            <Field label="Nome"><input className={inputCls} value={c.label} onChange={(e) => update(i, { label: e.target.value })} /></Field>
            <Field label="Ordem"><input className={inputCls} type="number" value={c.sort} onChange={(e) => update(i, { sort: Number(e.target.value) })} /></Field>
            <button aria-label="Apagar" className={`${btnGhost} mt-5`} onClick={async () => { if (confirm(`Apagar a categoria "${c.label}"? Os produtos dela ficarão sem categoria.`)) { await supabase.from("categories").delete().eq("id", c.id); refetch(); qc.invalidateQueries({ queryKey: ["site"] }); } }}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input className={inputCls} placeholder="Nova categoria" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <button className={btn} disabled={!newLabel.trim()} onClick={add}><Plus className="h-4 w-4" /> Adicionar</button>
      </div>
    </Card>
  );
}

/* ---------------- Content editor ---------------- */
function ListEditor<T extends Record<string, string>>({ items, fields, onChange }: { items: T[]; fields: [keyof T, string, boolean?][]; onChange: (v: T[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-lg bg-muted/50 p-2">
          <div className="grid flex-1 gap-2 md:grid-cols-2">
            {fields.map(([k, label, long]) => long
              ? <textarea key={String(k)} className={`${inputCls} md:col-span-2`} rows={2} placeholder={label} value={it[k]} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
              : <input key={String(k)} className={inputCls} placeholder={label} value={it[k]} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />)}
          </div>
          <button aria-label="Remover" className={btnGhost} onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button className={btnGhost} onClick={() => onChange([...items, Object.fromEntries(fields.map(([k]) => [k, ""])) as T])}><Plus className="h-4 w-4" /> Adicionar</button>
    </div>
  );
}

function ContentEditor({ section }: { section: "pagina" | "aparencia" | "loja" }) {
  const qc = useQueryClient();
  const [c, setC] = useState<SiteContent | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: products } = useQuery({ queryKey: ["admin-products"], queryFn: async () => ((await supabase.from("products").select("*").order("sort")).data ?? []) as ProductRow[] });
  const { data: cats } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => ((await supabase.from("categories").select("*").order("sort")).data ?? []) as CategoryRow[] });

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "content").maybeSingle().then(({ data }) => {
      const saved = (data?.value ?? {}) as Partial<SiteContent>;
      setC({ ...defaultContent, ...saved, colors: { ...defaultContent.colors, ...(saved.colors ?? {}) } });
    });
  }, []);
  if (!c) return <p className="text-muted-foreground">Carregando…</p>;
  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => setC({ ...c, [k]: v });
  const txt = (k: keyof SiteContent, label: string, long?: boolean) => (
    <Field label={label}>{long
      ? <textarea className={inputCls} rows={3} value={c[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      : <input className={inputCls} value={c[k] as string} onChange={(e) => set(k, e.target.value as never)} />}</Field>
  );
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("site_settings").upsert({ key: "content", value: c as never, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Alterações salvas!"); qc.invalidateQueries({ queryKey: ["site"] });
  };
  const saveBar = (
    <div className="sticky bottom-16 z-10 -mx-3 flex md:bottom-0 justify-end gap-2 bg-muted/90 p-3 backdrop-blur md:mx-0 md:rounded-2xl">
      <button className={btn} disabled={busy} onClick={save}>{busy ? "Salvando…" : "Salvar alterações"}</button>
    </div>
  );

  if (section === "aparencia") {
    const colorFields: [keyof SiteContent["colors"], string, string][] = [
      ["primary", "Cor principal (botões, faixa do topo, rodapé)", "#2f7f80"],
      ["accent", "Cor de destaque (selos, estrelas)", "#d9a441"],
      ["background", "Fundo da página", "#fbf8f2"],
      ["foreground", "Cor dos textos", "#1f3134"],
    ];
    return (
      <>
        <Card title="Cores do site">
          <div className="grid gap-4 md:grid-cols-2">
            {colorFields.map(([k, label, def]) => (
              <Field key={k} label={label}>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-10 w-14 rounded border border-input" value={c.colors[k] || def} onChange={(e) => set("colors", { ...c.colors, [k]: e.target.value })} />
                  <input className={inputCls} value={c.colors[k]} placeholder="padrão" onChange={(e) => set("colors", { ...c.colors, [k]: e.target.value })} />
                  {c.colors[k] && <button className="text-xs underline" onClick={() => set("colors", { ...c.colors, [k]: "" })}>padrão</button>}
                </div>
              </Field>
            ))}
          </div>
        </Card>
        <Card title="Nome da loja">
          <div className="grid gap-3 md:grid-cols-2">{txt("storeName", "Nome")}{txt("storeTagline", "Frase abaixo do nome")}</div>
        </Card>
        {saveBar}
      </>
    );
  }

  if (section === "loja") {
    return (
      <>
        <Card title="Dados da loja">
          <div className="grid gap-3 md:grid-cols-2">
            {txt("whatsapp", "WhatsApp que recebe os pedidos (com 55 e DDD, só números)")}
            {txt("instagram", "Instagram (sem @)")}
            <div className="md:col-span-2">{txt("address", "Endereço da loja")}</div>
            <div className="md:col-span-2">{txt("payments", "Formas de pagamento (separadas por vírgula)")}</div>
          </div>
        </Card>
        {saveBar}
      </>
    );
  }

  return (
    <>
      <Card title="Faixa do topo"><div className="grid gap-3">{txt("topbar", "Texto")}</div></Card>
      <Card title="Destaque principal (foto grande)">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="Foto de fundo"><MediaInput value={c.heroImage} onChange={(v) => set("heroImage", v)} /></Field></div>
          {txt("heroBadge", "Selo")}
          {txt("heroButton", "Texto do botão")}
          {txt("heroTitle", "Título (Enter quebra linha)", true)}
          {txt("heroText", "Texto", true)}
          <Field label="Produto aberto pelo botão">
            <select className={inputCls} value={c.heroProductId} onChange={(e) => set("heroProductId", e.target.value)}>
              <option value="">— Ir para o catálogo —</option>
              {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      </Card>
      <Card title="Benefícios (3 ícones)"><ListEditor items={c.benefits} fields={[["t", "Título"], ["s", "Texto"]]} onChange={(v) => set("benefits", v)} /></Card>
      <Card title="Categorias"><div className="grid gap-3">{txt("categoriesTitle", "Título da seção")}</div></Card>
      <Card title="Banner com vídeo">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Vídeo (toca sozinho, sem som)"><MediaInput video value={c.bannerVideo} onChange={(v) => set("bannerVideo", v)} /></Field>
          <Field label="Foto (aparece se não houver vídeo)"><MediaInput value={c.bannerImage} onChange={(v) => set("bannerImage", v)} /></Field>
          {txt("bannerTitle", "Título")}
          {txt("bannerButton", "Texto do botão")}
          <div className="md:col-span-2">{txt("bannerText", "Texto", true)}</div>
          <Field label="Categoria aberta pelo botão">
            <select className={inputCls} value={c.bannerCategory} onChange={(e) => set("bannerCategory", e.target.value)}>
              {(cats ?? []).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </Field>
        </div>
      </Card>
      <Card title="Catálogo"><div className="grid gap-3">{txt("catalogTitle", "Título da seção")}</div></Card>
      <Card title="Como comprar">
        <div className="grid gap-3 md:grid-cols-2">{txt("howTitle", "Título")}{txt("howSubtitle", "Subtítulo")}</div>
        <div className="mt-3"><ListEditor items={c.steps} fields={[["t", "Passo"], ["s", "Descrição"]]} onChange={(v) => set("steps", v)} /></div>
      </Card>
      <Card title="Sobre a loja">
        <div className="grid gap-3">{txt("aboutTitle", "Título")}{txt("aboutText", "Texto", true)}</div>
        <div className="mt-3"><ListEditor items={c.stats} fields={[["a", "Destaque"], ["b", "Legenda"]]} onChange={(v) => set("stats", v)} /></div>
      </Card>
      <Card title="Depoimentos">
        <div className="grid gap-3">{txt("reviewsTitle", "Título")}</div>
        <div className="mt-3"><ListEditor items={c.reviews} fields={[["n", "Nome"], ["t", "Depoimento", true]]} onChange={(v) => set("reviews", v)} /></div>
      </Card>
      <Card title="Dúvidas frequentes">
        <div className="grid gap-3">{txt("faqTitle", "Título")}</div>
        <div className="mt-3"><ListEditor items={c.faq} fields={[["q", "Pergunta"], ["a", "Resposta", true]]} onChange={(v) => set("faq", v)} /></div>
      </Card>
      <Card title="Rodapé"><div className="grid gap-3">{txt("footerText", "Texto", true)}</div></Card>
      {saveBar}
    </>
  );
}

/* ---------------- Account ---------------- */
function Account({ email }: { email: string }) {
  const [newEmail, setNewEmail] = useState(email);
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  return (
    <>
      <Card title="Trocar senha">
        <div className="grid gap-3 md:max-w-sm">
          <input className={inputCls} type="password" placeholder="Senha atual" value={cur} onChange={(e) => setCur(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Nova senha (mín. 6 caracteres)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className={btn} disabled={pw.length < 6} onClick={async () => {
            const { error } = await supabase.auth.updateUser({ password: pw, ...(cur ? { current_password: cur } : {}) } as never);
            if (error) toast.error(error.message); else { toast.success("Senha alterada!"); setPw(""); setCur(""); }
          }}>Salvar nova senha</button>
        </div>
      </Card>
      <Card title="Trocar e-mail de acesso">
        <div className="grid gap-3 md:max-w-sm">
          <input className={inputCls} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <button className={btn} disabled={!newEmail || newEmail === email} onClick={async () => {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) toast.error(error.message); else toast.success("Pronto! Se pedir confirmação, verifique a caixa de entrada.");
          }}>Salvar novo e-mail</button>
        </div>
      </Card>
    </>
  );
}
