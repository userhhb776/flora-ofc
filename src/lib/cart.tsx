import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type CartLine, type Product } from "./store";

type Ctx = {
  lines: CartLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("fp-cart2") || "[]") as CartLine[];
      setLines(raw.filter((r) => r?.product?.id && r.qty > 0));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("fp-cart2", JSON.stringify(lines));
  }, [lines]);

  const add = (p: Product, qty = 1) => {
    setLines((ls) => {
      const ex = ls.find((l) => l.product.id === p.id);
      return ex ? ls.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + qty } : l)) : [...ls, { product: p, qty }];
    });
    setOpen(true);
  };
  const setQty = (id: string, qty: number) =>
    setLines((ls) => (qty <= 0 ? ls.filter((l) => l.product.id !== id) : ls.map((l) => (l.product.id === id ? { ...l, qty } : l))));

  return (
    <CartContext.Provider value={{ lines, open, setOpen, add, setQty, clear: () => setLines([]), count: lines.reduce((s, l) => s + l.qty, 0) }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
