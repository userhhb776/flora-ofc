import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { defaultContent, media, uploadMedia, type CategoryRow, type ProductRow, type SiteContent } from "@/lib/site";
import { brl } from "@/lib/store";
import { LogOut, Upload, Trash2, Plus, ExternalLink } from "lucide-react";

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
  ["geral", "Visão geral"], ["pedidos", "Pedidos"], ["produtos", "Produtos"], ["categorias", "Categorias"],
  ["pagina", "Página inicial"], ["aparencia", "Aparência"], ["loja", "Loja"], ["conta", "Conta"],
] as const;
type Tab = (typeof TABS)[number][0];

function Panel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("geral");
  const qc = useQueryClient();
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); };
  return (
    <div className="mx-auto max-w-6xl p-3 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Painel Flora Pura</h1>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" className={btnGhost}><ExternalLink className="h-4 w-4" /> Ver loja</a>
          <button onClick={signOut} className={btnGhost}><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </header>
      <nav className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === id ? "bg-primary text-primary-foreground" : "bg-card"}`}>{label}</button>
        ))}
      </nav>
      <main className="mt-4">
        {tab === "geral" && <Overview />}
        {tab === "pedidos" && <Orders />}
        {tab === "produtos" && <Products />}
        {tab === "categorias" && <Categories />}
        {(tab === "pagina" || tab === "aparencia" || tab === "loja") && <ContentEditor section={tab} />}
        {tab === "conta" && <Account email={email} />}
      </main>
    </div>
  );
}

function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl bg-card p-4 shadow-sm">
      {(title || right) && <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-sans text-base font-bold">{title}</h2>{right}</div>}
      {children}
    </section>
  );
}

/* ---------------- Overview ---------------- */
function Overview() {
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
      return { today, week, month, total, perDay, orders: ord.slice(0, 5), monthCount: monthOrders.length, monthRevenue: monthOrders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + Number(o.total), 0) };
    },
  });
  if (!data) return <p className="text-muted-foreground">Carregando…</p>;
  const max = Math.max(1, ...data.perDay.map((p) => p.n));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[["Acessos hoje", data.today], ["Últimos 7 dias", data.week], ["Últimos 30 dias", data.month], ["Total de acessos", data.total], ["Pedidos (30 dias)", data.monthCount], ["Vendas (30 dias)", brl(data.monthRevenue)]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl bg-card p-4 shadow-sm"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-xl font-bold">{v}</p></div>
        ))}
      </div>
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
      <Card title="Pedidos recentes">
        {data.orders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p> :
          data.orders.map((o) => <OrderRow key={o.id} o={o as OrderT} />)}
      </Card>
    </>
  );
}

/* ---------------- Orders ---------------- */
type OrderT = { id: string; created_at: string; customer: { name?: string; delivery?: string; address?: string; payment?: string; notes?: string }; items: { name: string; qty: number; price: number }[]; total: number; status: string };
const STATUSES = ["novo", "em preparo", "entregue", "cancelado"];

function OrderRow({ o, onStatus, onDelete }: { o: OrderT; onStatus?: (s: string) => void; onDelete?: () => void }) {
  return (
    <div className="border-b border-border py-3 text-sm last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{o.customer?.name || "Sem nome"} • {brl(Number(o.total))}</p>
          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")} • {o.customer?.delivery === "retirada" ? "Retirada" : `Entrega: ${o.customer?.address ?? ""}`} • {o.customer?.payment}</p>
        </div>
        {onStatus ? (
          <div className="flex gap-2">
            <select className={`${inputCls} w-auto`} value={o.status} onChange={(e) => onStatus(e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <button aria-label="Apagar" onClick={onDelete} className={btnGhost}><Trash2 className="h-4 w-4" /></button>
          </div>
        ) : <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{o.status}</span>}
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
  const list = (data ?? []).filter((o) => filter === "todos" || o.status === filter);
  return (
    <Card title={`Pedidos (${list.length})`} right={
      <select className={`${inputCls} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="todos">Todos</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>}>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido.</p>}
      {list.map((o) => (
        <OrderRow key={o.id} o={o}
          onStatus={async (s) => { await supabase.from("orders").update({ status: s }).eq("id", o.id); refetch(); }}
          onDelete={async () => { if (confirm("Apagar este pedido?")) { await supabase.from("orders").delete().eq("id", o.id); refetch(); } }} />
      ))}
    </Card>
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
const emptyProduct: ProductRow = { id: "", name: "", category: "", price: 0, old_price: null, image: "", badge: "", description: "", stock: null, featured: false, visible: true, sort: 0 };

function Products() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<ProductRow | null>(null);
  const [search, setSearch] = useState("");
  const { data: cats } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => ((await supabase.from("categories").select("*").order("sort")).data ?? []) as CategoryRow[] });
  const { data, refetch } = useQuery({ queryKey: ["admin-products"], queryFn: async () => ((await supabase.from("products").select("*").order("sort")).data ?? []) as ProductRow[] });
  const list = (data ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const save = async (p: ProductRow) => {
    const row = { ...p, badge: p.badge || null, old_price: p.old_price || null };
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
      <div className="divide-y divide-border">
        {list.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <img src={media(p.image)} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name} {!p.visible && <span className="text-xs text-destructive">(oculto)</span>}</p>
              <p className="text-xs text-muted-foreground">{brl(Number(p.price))} • {cats?.find((c) => c.id === p.category)?.label ?? p.category} • Estoque: {p.stock ?? "ilimitado"}</p>
            </div>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={p.featured} onChange={(e) => quick(p.id, { featured: e.target.checked })} /> Destaque</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={p.visible} onChange={(e) => quick(p.id, { visible: e.target.checked })} /> Visível</label>
            <button className={btnGhost} onClick={() => setEdit(p)}>Editar</button>
            <button aria-label="Apagar" className={btnGhost} onClick={async () => { if (confirm(`Apagar "${p.name}"?`)) { await supabase.from("products").delete().eq("id", p.id); refetch(); qc.invalidateQueries({ queryKey: ["site"] }); } }}><Trash2 className="h-4 w-4" /></button>
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
        <div className="md:col-span-2"><Field label="Foto"><MediaInput value={p.image} onChange={(v) => set("image", v)} /></Field></div>
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
    <div className="sticky bottom-0 z-10 -mx-3 flex justify-end gap-2 bg-muted/90 p-3 backdrop-blur md:mx-0 md:rounded-2xl">
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
