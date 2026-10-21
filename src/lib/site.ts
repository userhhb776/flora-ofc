import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero.jpg";
import capilar from "@/assets/capilar.jpg";
import oleos from "@/assets/oleos.jpg";
import skincare from "@/assets/skincare.jpg";
import perfume from "@/assets/perfume.jpg";
import banana from "@/assets/banana.jpg";
import bananaVideo from "@/assets/banana.mp4.asset.json";
import { ADDRESS, WHATSAPP, categories as staticCats, products as staticProducts, type Product } from "./store";

const ASSETS: Record<string, string> = { hero, capilar, oleos, skincare, perfume, banana, bananaVideo: bananaVideo.url };

/** Resolves "asset:name" to bundled files; anything else is used as-is. */
export const media = (src?: string | null) => {
  if (!src) return "";
  return src.startsWith("asset:") ? ASSETS[src.slice(6)] ?? "" : src;
};

export const defaultContent = {
  topbar: "Pedidos pelo WhatsApp • Entrega em Poços de Caldas",
  storeName: "Flora Pura",
  storeTagline: "Poços de Caldas",
  heroImage: "asset:hero",
  heroBadge: "Oferta de lançamento",
  heroTitle: "Body Splash\nFlora Pura",
  heroText: "Sete fragrâncias exclusivas por apenas R$ 89,90.",
  heroButton: "Comprar agora",
  heroProductId: "body-splash",
  benefits: [
    { t: "Atendimento", s: "via WhatsApp" },
    { t: "Entrega", s: "em toda a cidade" },
    { t: "Natural", s: "e linha vegana" },
  ],
  categoriesTitle: "Navegue por categorias",
  bannerVideo: "asset:bananaVideo",
  bannerImage: "asset:banana",
  bannerTitle: "Nova linha Frutas: Banana",
  bannerText: "Produtos inspirados na banana para transformar o autocuidado em um momento ainda mais gostoso.",
  bannerButton: "Conhecer a linha",
  bannerCategory: "lancamentos",
  catalogTitle: "Nosso catálogo",
  howTitle: "Como comprar",
  howSubtitle: "Simples, rápido e sem cadastro.",
  steps: [
    { t: "Escolha seus produtos", s: "Navegue pelo catálogo e coloque o que gostar na sacola." },
    { t: "Informe seus dados", s: "Nome, entrega ou retirada na loja e forma de pagamento." },
    { t: "Envie pelo WhatsApp", s: "Seu pedido chega pronto para nós. É só confirmar!" },
  ],
  aboutTitle: "A essência pura da natureza",
  aboutText: "A Flora Pura nasceu para levar cuidado natural para o seu dia a dia. Na nossa loja no centro de Poços de Caldas você encontra skincare, cabelo, perfumaria, óleos essenciais e uma linha vegana completa, com atendimento próximo e carinhoso.",
  stats: [
    { a: "100%", b: "atendimento humano" },
    { a: "Vegana", b: "linha sem origem animal" },
    { a: "Centro", b: "de Poços de Caldas" },
  ],
  reviewsTitle: "Quem usa, ama",
  reviews: [
    { n: "Mariana S.", t: "O body splash Doce Vanilla é maravilhoso, fixa muito! Atendimento super rápido pelo WhatsApp." },
    { n: "Juliana R.", t: "Amei a linha de banana, o cheirinho é delicioso e deixou meu cabelo macio." },
    { n: "Carla M.", t: "Loja linda no centro de Poços, produtos naturais de qualidade. Recomendo!" },
  ],
  faqTitle: "Dúvidas frequentes",
  faq: [
    { q: "Preciso criar conta?", a: "Não! Você monta a sacola e envia o pedido direto pelo WhatsApp." },
    { q: "Vocês entregam?", a: "Sim, entregamos em Poços de Caldas. Você também pode retirar na loja." },
    { q: "Quais formas de pagamento?", a: "Pix, cartão de crédito, cartão de débito e dinheiro." },
    { q: "Posso tirar dúvidas antes de comprar?", a: "Claro! Fale com a gente pelo WhatsApp a qualquer momento." },
  ],
  footerText: "Entregamos a essência pura da natureza para sua pele & casa. Skincare • cabelo • óleos essenciais • linha vegana.",
  whatsapp: WHATSAPP,
  address: ADDRESS,
  instagram: "florapurasuldeminas",
  payments: "Pix, Cartão de crédito, Cartão de débito, Dinheiro",
  colors: { primary: "", accent: "", background: "", foreground: "" },
};

export type SiteContent = typeof defaultContent;

export type ProductRow = {
  id: string; name: string; category: string; price: number; old_price: number | null; image: string;
  badge: string | null; description: string; stock: number | null; featured: boolean; visible: boolean; sort: number;
  images: string[]; video: string;
};
export type CategoryRow = { id: string; label: string; image: string; sort: number };

export const rowToProduct = (r: ProductRow): Product => ({
  id: r.id, name: r.name, category: r.category as Product["category"], price: Number(r.price),
  ...(r.old_price != null ? { oldPrice: Number(r.old_price) } : {}), image: media(r.image),
  ...(r.badge ? { badge: r.badge } : {}), description: r.description, stock: r.stock, featured: r.featured,
  images: [r.image, ...(Array.isArray(r.images) ? r.images : [])].filter(Boolean).map((x) => media(x)), video: media(r.video),
});

const fallback = {
  content: defaultContent,
  categories: staticCats.map((c) => ({ id: c.id as string, label: c.label, image: c.image })),
  products: staticProducts,
};

export function useSiteData() {
  return useQuery({
    queryKey: ["site"],
    placeholderData: fallback,
    queryFn: async () => {
      const [s, c, p] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "content").maybeSingle(),
        supabase.from("categories").select("*").order("sort"),
        supabase.from("products").select("*").eq("visible", true).order("sort"),
      ]);
      const saved = (s.data?.value ?? {}) as Partial<SiteContent>;
      return {
        content: { ...defaultContent, ...saved, colors: { ...defaultContent.colors, ...(saved.colors ?? {}) } },
        categories: (c.data ?? []).map((x) => ({ id: x.id, label: x.label, image: media(x.image) })),
        products: ((p.data ?? []) as ProductRow[]).map(rowToProduct),
      };
    },
  });
}

/** Uploads a file to storage and returns a long-lived link. */
export async function uploadMedia(file: File) {
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 20);
  if (error) throw error;
  return data.signedUrl;
}
