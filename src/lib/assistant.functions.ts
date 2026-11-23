import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `Você é o assistente da loja Flora Pura (Poços de Caldas), dentro do painel do administrador.
Ajude a organizar produtos, sugerir edições, criar relatórios e escrever textos de venda (copys).
Responda sempre em português do Brasil, de forma simples e direta. Use markdown (listas, negrito, tabelas) quando ajudar.
Para escrever copys, imite o estilo, tom e tamanho dos textos atuais da loja que estão no contexto.
Quando o administrador pedir para MUDAR algo na loja, além de explicar, inclua no fim um bloco assim (um por resposta, com uma lista de ações):
\`\`\`acoes
[{"tipo":"produto","id":"ID_DO_PRODUTO","campos":{"name":"...","price":89.9,"description":"...","stock":10,"badge":"...","featured":true,"visible":true,"category":"..."}},
 {"tipo":"texto","chave":"heroTitle","valor":"..."}]
\`\`\`
Inclua só os campos que mudam. Chaves de texto válidas são as do objeto "textos" do contexto (apenas valores de texto simples). Nunca invente IDs de produto.`;

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: Msg[] }) => {
    if (!Array.isArray(d?.messages) || d.messages.length === 0 || d.messages.length > 60) throw new Error("invalid");
    // Never trust client-supplied roles: everything is sent as "user"; earlier assistant turns are quoted as history.
    return { messages: d.messages.map((m) => ({ role: "user", content: (m.role === "assistant" ? "[Resposta anterior do assistente, apenas histórico]: " : "") + String(m.content).slice(0, 8000) })) as Msg[] };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso negado");
    const key = process.env["GROK_API_KEY"];
    if (!key) throw new Error("Assistente não configurado");

    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [p, c, s, o, v] = await Promise.all([
      sb.from("products").select("id,name,category,price,old_price,stock,badge,featured,visible,description").order("sort"),
      sb.from("categories").select("id,label").order("sort"),
      sb.from("site_settings").select("value").eq("key", "content").maybeSingle(),
      sb.from("orders").select("created_at,status,total,items").gte("created_at", since).order("created_at", { ascending: false }).limit(200),
      sb.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    const content = (s.data?.value ?? {}) as Record<string, unknown>;
    const textos = Object.fromEntries(Object.entries(content).filter(([, val]) => typeof val === "string" && !String(val).startsWith("http") && !String(val).startsWith("asset:")));
    const ctx = {
      hoje: new Date().toISOString().slice(0, 10),
      produtos: p.data ?? [], categorias: c.data ?? [], textos,
      pedidos_ultimos_30_dias: (o.data ?? []).map((x) => ({ data: x.created_at.slice(0, 10), status: x.status, total: x.total, itens: x.items })),
      acessos_ultimos_30_dias: v.count ?? 0,
    };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-4-fast-non-reasoning", stream: false,
        messages: [{ role: "system", content: `${SYSTEM}\n\nCONTEXTO ATUAL DA LOJA (JSON):\n${JSON.stringify(ctx)}` }, ...data.messages],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("grok", res.status, t);
      throw new Error(res.status === 401 ? "Chave do assistente inválida" : res.status === 429 ? "Muitos pedidos agora, tente em instantes" : "O assistente não respondeu, tente de novo");
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { reply: j.choices?.[0]?.message?.content ?? "" };
  });
