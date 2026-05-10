import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "doyuran_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Akşam yemeği: ayrı ürün listesi (menüden bağımsız seçim + adet)
  const [dinnerEnabled, setDinnerEnabled] = useState(false);
  const [dinnerItems, setDinnerItems] = useState([]); // [{id, name, quantity}]

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
        category: menuItem.category || "Ana Yemek",
        quantity: qty,
      }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) { removeItem(id); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const clear = () => {
    setItems([]);
    setDinnerEnabled(false);
    setDinnerItems([]);
  };

  // --- Akşam yemeği fonksiyonları ---
  const setDinner = useCallback((enabled) => {
    setDinnerEnabled(enabled);
    if (!enabled) setDinnerItems([]);
  }, []);

  const addDinnerItem = useCallback((menuItem) => {
    setDinnerItems((prev) => {
      const existing = prev.find((i) => i.id === menuItem.id);
      if (existing) {
        return prev.map((i) => i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: menuItem.id, name: menuItem.name, quantity: 1 }];
    });
  }, []);

  const updateDinnerQty = useCallback((id, qty) => {
    if (qty <= 0) {
      setDinnerItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setDinnerItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }, []);

  const removeDinnerItem = useCallback((id) => {
    setDinnerItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // Akşam yemeği özeti (API'ye gönderilecek metin)
  const dinnerSummary = useMemo(() => {
    if (!dinnerEnabled || dinnerItems.length === 0) return "";
    return dinnerItems.map((i) => `${i.name} x${i.quantity}`).join(", ");
  }, [dinnerEnabled, dinnerItems]);

  const count = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{
      items, addItem, updateQty, removeItem, clear, count,
      dinnerEnabled, setDinner, dinnerItems, addDinnerItem, updateDinnerQty, removeDinnerItem, dinnerSummary,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
