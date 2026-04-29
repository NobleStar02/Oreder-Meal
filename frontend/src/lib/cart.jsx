import { createContext, useContext, useEffect, useState, useMemo } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "doyuran_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (menuItem, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === menuItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === menuItem.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        image_path: menuItem.image_path,
        quantity: qty,
      }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const total = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );
  const count = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
