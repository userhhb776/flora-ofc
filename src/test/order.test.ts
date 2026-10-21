import { describe, it, expect } from "vitest";
import { buildOrderMessage, cartTotal, products, whatsappLink } from "@/lib/store";

const lines = [
  { product: products.find((p) => p.id === "body-splash")!, qty: 2 },
  { product: products.find((p) => p.id === "lavanda")!, qty: 1 },
];

describe("pedido WhatsApp", () => {
  it("soma o total do carrinho", () => {
    expect(cartTotal(lines)).toBe(229.7);
  });
  it("envia para o número da loja", () => {
    expect(whatsappLink("oi")).toContain("wa.me/556892629717");
  });
  it("inclui o endereço de entrega no pedido", () => {
    const msg = buildOrderMessage(lines, { name: "Ana", delivery: "entrega", address: "Rua X, 10", payment: "Pix", notes: "" });
    expect(msg).toContain("Rua X, 10");
  });
});
