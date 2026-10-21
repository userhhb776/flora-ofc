import hero from "@/assets/hero.jpg";
import capilar from "@/assets/capilar.jpg";
import oleos from "@/assets/oleos.jpg";
import skincare from "@/assets/skincare.jpg";
import perfume from "@/assets/perfume.jpg";
import bananaImg from "@/assets/banana.jpg";
const bananaAsset = { url: bananaImg };

export const WHATSAPP = "556892629717";
export const ADDRESS = "Rua Prefeito Chagas, 15, Centro, Poços de Caldas - MG, CEP 37701-010";

export type Category = "lancamentos" | "perfumaria" | "skincare" | "cabelo" | "oleos" | "vegana";

export const categories: { id: Category; label: string; image: string }[] = [
  { id: "lancamentos", label: "Linha Frutas", image: bananaAsset.url },
  { id: "perfumaria", label: "Perfumaria", image: perfume },
  { id: "skincare", label: "Skincare", image: skincare },
  { id: "cabelo", label: "Cabelo", image: capilar },
  { id: "oleos", label: "Óleos essenciais", image: oleos },
  { id: "vegana", label: "Linha vegana", image: hero },
];

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  description: string;
};

export const products: Product[] = [
  { id: "banana-shampoo", name: "Shampoo Frutas Banana", category: "lancamentos", price: 59.9, image: bananaAsset.url, badge: "Lançamento", description: "Limpeza suave com extrato de banana, que nutre e devolve o brilho dos fios." },
  { id: "banana-hidratante", name: "Loção Hidratante Banana", category: "lancamentos", price: 64.9, image: bananaAsset.url, badge: "Lançamento", description: "Hidratação cremosa com perfume doce de banana para o corpo todo." },
  { id: "banana-mascara", name: "Máscara Capilar Banana", category: "lancamentos", price: 69.9, image: bananaAsset.url, badge: "Lançamento", description: "Nutrição intensa para cabelos secos, com toque macio e cheiro gostoso." },
  { id: "banana-sabonete", name: "Sabonete Líquido Banana", category: "lancamentos", price: 44.9, image: bananaAsset.url, description: "Banho perfumado e cremoso, que limpa sem ressecar a pele." },
  { id: "body-splash", name: "Body Splash Flora Pura 200ml", category: "perfumaria", price: 89.9, oldPrice: 119.9, image: hero, badge: "Oferta", description: "Sete fragrâncias exclusivas: Velvet Bloom, Liberty Grace, Elísia, Doce Vanilla, Elegance Style, Tunísia e Aurora Essence." },
  { id: "lady-flora", name: "Lady Flora Eau de Parfum", category: "perfumaria", price: 299.9, image: perfume, badge: "Lançamento", description: "Floral elegante e marcante, feito para durar o dia inteiro." },
  { id: "selvagem", name: "Perfume Selvagem", category: "perfumaria", price: 299.9, image: perfume, description: "Amadeirado intenso com notas de especiarias." },
  { id: "flor-jurema", name: "Perfume Flor de Jurema", category: "perfumaria", price: 219.9, image: perfume, badge: "Destaque", description: "Inspirado na flor brasileira, com fundo suave e acolhedor." },
  { id: "future", name: "Perfume Future", category: "perfumaria", price: 115.45, oldPrice: 230.9, image: perfume, badge: "50% off", description: "Fresco e moderno, com saída cítrica." },
  { id: "serum", name: "Sérum Facial Vitamina C", category: "skincare", price: 129.9, image: skincare, description: "Uniformiza o tom e ilumina a pele. Fórmula leve." },
  { id: "creme-facial", name: "Creme Facial Nutritivo", category: "skincare", price: 109.9, image: skincare, description: "Manteigas vegetais e antioxidantes para hidratação profunda." },
  { id: "gloss", name: "Gloss By Flora Face", category: "skincare", price: 39.9, image: skincare, badge: "Novo", description: "Brilho com cor e cuidado para os lábios." },
  { id: "oleo-capilar", name: "Óleo Capilar Reparador", category: "cabelo", price: 69.9, image: capilar, description: "Brilho, maciez e proteção contra o frizz." },
  { id: "kit-carnauba", name: "Kit Especial Carnaúba", category: "cabelo", price: 149.9, image: capilar, badge: "Kit", description: "Linha Carnaúba – viva o sertão. Cuidado completo para os fios." },
  { id: "lavanda", name: "Óleo Essencial de Lavanda", category: "oleos", price: 49.9, image: oleos, description: "Calmante e relaxante. 100% puro, 10ml." },
  { id: "alecrim", name: "Óleo Essencial de Alecrim", category: "oleos", price: 49.9, image: oleos, description: "Energizante e ótimo para o couro cabeludo. 10ml." },
  { id: "eucalipto", name: "Óleo Essencial de Eucalipto", category: "oleos", price: 44.9, image: oleos, description: "Refrescante, ideal para aromatizar a casa. 10ml." },
  { id: "sabonete-vegano", name: "Sabonete Vegano Ervas", category: "vegana", price: 29.9, image: hero, description: "Sem ingredientes de origem animal. Perfume de ervas frescas." },
  { id: "hidratante-vegano", name: "Hidratante Vegano Corporal", category: "vegana", price: 79.9, image: skincare, description: "Pele macia com ativos naturais e veganos." },
];

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type CartLine = { product: Product; qty: number };
export type Customer = {
  name: string;
  delivery: "entrega" | "retirada";
  address: string;
  payment: string;
  notes: string;
};

export const cartTotal = (lines: CartLine[]) =>
  Math.round(lines.reduce((s, l) => s + l.product.price * l.qty, 0) * 100) / 100;

export function buildOrderMessage(lines: CartLine[], c: Customer) {
  const items = lines
    .map((l) => `• ${l.qty}x ${l.product.name} — ${brl(l.product.price * l.qty)}`)
    .join("\n");
  const where =
    c.delivery === "entrega"
      ? `🚚 *Entrega em:* ${c.address}`
      : `🏬 *Retirada na loja:* ${ADDRESS}`;
  return [
    "Olá, Flora Pura! 🌿 Quero fazer um pedido:",
    "",
    items,
    "",
    `*Total:* ${brl(cartTotal(lines))}`,
    "",
    `👤 *Nome:* ${c.name}`,
    where,
    `💳 *Pagamento:* ${c.payment}`,
    c.notes ? `📝 *Obs.:* ${c.notes}` : "",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .trim();
}

export const whatsappLink = (text: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
