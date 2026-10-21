import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Bot, Send, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askAssistant } from "@/lib/assistant.functions";

type Msg = { role: "user" | "assistant"; content: string };
type Action = { tipo: "produto"; id: string; campos: Record<string, unknown> } | { tipo: "texto"; chave: string; valor: string };

const KEY = "fp-assistant";
const PRODUCT_FIELDS = ["name", "price", "old_price", "description", "stock", "badge", "featured", "visible", "category", "sort"];
const SUGGESTIONS = [
  "Faça um relatório das vendas dos últimos 30 dias",
  "Quais produtos estão com estoque baixo?",
  "Crie uma descrição nova para o Body Splash no estilo da loja",
  "Sugira 3 títulos para a capa da Black Friday",
];

function splitActions(text: string): { body: string; actions: Action[] } {
  const m = text.match(/```acoes\s*([\s\S]*?)```/);
  if (!m) return { body: text, actions: [] };
  try {
    const parsed = JSON.parse(m[1]);
    return { body: text.replace(m[0], "").trim(), actions: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { body: text, actions: [] };
  }
}

function describe(a: Action) {
  return a.tipo === "produto" ? `Produto ${a.id}: ${Object.keys(a.campos ?? {}).join(", ")}` : `Texto "${a.chave}"`;
}

export function Assistant() {
  const ask = useServerFn(askAssistant);
  const qc = useQueryClient();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<Record<number, boolean>>({});
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { setMsgs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ } }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await ask({ data: { messages: next.slice(-20) } });
      setMsgs([...next, { role: "assistant", content: r.reply || "(sem resposta)" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no assistente");
      setMsgs(next);
    }
    setBusy(false);
    box.current?.focus();
  };

  const apply = async (idx: number, actions: Action[]) => {
    try {
      for (const a of actions) {
        if (a.tipo === "produto") {
          const campos = Object.fromEntries(Object.entries(a.campos ?? {}).filter(([k]) => PRODUCT_FIELDS.includes(k)));
          const { error } = await supabase.from("products").update(campos).eq("id", a.id);
          if (error) throw error;
        } else if (a.tipo === "texto" && typeof a.valor === "string") {
          const { data } = await supabase.from("site_settings").select("value").eq("key", "content").maybeSingle();
          const value = { ...((data?.value as object) ?? {}), [a.chave]: a.valor };
          const { error } = await supabase.from("site_settings").upsert({ key: "content", value, updated_at: new Date().toISOString() });
          if (error) throw error;
        }
      }
      setApplied((s) => ({ ...s, [idx]: true }));
      qc.invalidateQueries();
      toast.success("Alterações aplicadas na loja!");
    } catch {
      toast.error("Não foi possível aplicar. Confira e tente de novo.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col rounded-2xl border border-border bg-card shadow-sm md:h-[calc(100vh-9rem)]">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></span><div><p className="text-sm font-bold">Flora, sua assistente</p><p className="text-[11px] text-muted-foreground">Conhece seus produtos, pedidos e textos</p></div></div>
        {msgs.length > 0 && <button onClick={() => { setMsgs([]); setApplied({}); }} className="flex items-center gap-1 text-xs text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /> Nova conversa</button>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {msgs.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Peça qualquer coisa. Exemplos:</p>
            {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="block w-full rounded-xl bg-muted px-3 py-2 text-left text-sm">{s}</button>)}
          </div>
        )}
        {msgs.map((m, i) => {
          if (m.role === "user") return <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{m.content}</div>;
          const { body, actions } = splitActions(m.content);
          return (
            <div key={i} className="max-w-full text-sm">
              <div className="prose prose-sm max-w-none [&_table]:block [&_table]:overflow-x-auto"><ReactMarkdown>{body}</ReactMarkdown></div>
              {actions.length > 0 && (
                <div className="mt-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <p className="mb-1 text-xs font-bold">Mudanças sugeridas:</p>
                  <ul className="mb-2 list-disc pl-4 text-xs">{actions.map((a, k) => <li key={k}>{describe(a)}</li>)}</ul>
                  <button disabled={applied[i]} onClick={() => apply(i, actions)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                    <Check className="h-3.5 w-3.5" /> {applied[i] ? "Aplicado" : "Aplicar na loja"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {busy && <p className="animate-pulse text-sm text-muted-foreground">Pensando…</p>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-border p-3">
        <textarea ref={box} autoFocus rows={1} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Escreva aqui…" className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" aria-label="Enviar" disabled={busy || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

const MANUAL: { t: string; items: string[] }[] = [
  { t: "🏠 Visão geral", items: ["É a tela de início. Mostra quantas pessoas visitaram a loja, quanto você vendeu e os últimos pedidos.", "Os produtos acabando aparecem aqui para você lembrar de repor."] },
  { t: "🛒 Pedidos", items: ["Todo pedido que o cliente manda pelo WhatsApp aparece aqui, com nome e telefone.", "Toque no status para mudar: Novo → Confirmado → Em preparo → Entregue.", "Quando você marca Confirmado, o estoque dos produtos diminui sozinho. Se cancelar, o estoque volta.", "Toque no telefone para abrir a conversa no WhatsApp."] },
  { t: "📦 Produtos", items: ["Toque em “Novo produto” para cadastrar. Coloque nome, preço, foto e categoria.", "Pode colocar várias fotos e um vídeo. A primeira foto é a que aparece na vitrine.", "Estoque: escreva quantos você tem. Deixe vazio se não quiser controlar. Com 0 aparece “Esgotado”.", "“Visível” desligado esconde o produto da loja sem apagar.", "“Destaque” coloca o produto em evidência."] },
  { t: "🏷️ Categorias", items: ["São os grupos da loja (Cabelo, Skincare…). Cada uma tem um nome e uma foto que aparece na bolinha.", "O número de ordem decide quem aparece primeiro."] },
  { t: "⭐ Avaliações", items: ["Só quem comprou e teve o pedido marcado como Entregue consegue avaliar.", "Você pode responder, esconder ou apagar cada avaliação.", "Para desligar as avaliações, vá em Página inicial e desmarque a opção."] },
  { t: "🔔 Avisos", items: ["Aqui chegam os alertas: pedido novo, estoque acabando, avaliação nova e metas batidas.", "O sininho no topo mostra quantos avisos você ainda não leu."] },
  { t: "🖤 Black Friday", items: ["Ligue o modo para a loja ficar com cara de promoção.", "Você escolhe o título, a faixa rolando no topo e os cupons de desconto.", "O cliente digita o cupom na sacola e o desconto é aplicado sozinho.", "Desligue quando a promoção acabar. Sempre toque em Salvar."] },
  { t: "🖼️ Página inicial", items: ["Muda todos os textos e fotos da loja.", "Capa: troque a foto ou vídeo de fundo, o selo, o título, o texto e o botão.", "Quer mais de uma capa? Toque em “Adicionar capa”. Elas trocam sozinhas a cada 6 segundos.", "Depois de mudar, toque em Salvar no fim da página."] },
  { t: "🎨 Aparência", items: ["Escolha as cores principais da loja. Deixe vazio para voltar à cor original."] },
  { t: "🏪 Loja", items: ["Número do WhatsApp que recebe os pedidos (com 55 e DDD), Instagram, endereço e formas de pagamento."] },
  { t: "🤖 Assistente", items: ["Converse como se fosse uma pessoa. Peça relatórios, textos, ideias de promoção.", "Quando ela sugerir mudar algo (preço, descrição, título), aparece o botão “Aplicar na loja”. Só muda se você tocar nele.", "Ela escreve no mesmo jeitinho dos textos que já estão na loja."] },
  { t: "👤 Conta", items: ["Troque seu e-mail e sua senha de acesso. Use uma senha que só você saiba."] },
];

export function Manual() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground"><p className="font-bold">Bem-vindo ao seu painel! 💚</p><p className="mt-1 text-sm opacity-90">Aqui você manda em tudo da loja. Toque em um assunto para ver como funciona. Regra de ouro: depois de mudar algo, toque em <b>Salvar</b>.</p></div>
      {MANUAL.map((s) => (
        <details key={s.t} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <summary className="cursor-pointer font-bold">{s.t}</summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{s.items.map((x) => <li key={x}>{x}</li>)}</ul>
        </details>
      ))}
    </div>
  );
}
