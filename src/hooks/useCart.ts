import { useState, useEffect, useCallback } from 'react';

export interface CartItem {
  id?: string;
  listing_id: string;
  title: string;
  provider_name: string;
  provider_id: string;
  modality: string | string[];
  price_per_hour: number;
  hours: number;
  added_at: number;
}

const CART_KEY = 'db_cart';

function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'added_at'>) => {
    setItems(prev => {
      const existing = prev.findIndex(i => i.listing_id === item.listing_id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], hours: item.hours, added_at: Date.now() };
        return updated;
      }
      return [...prev, { ...item, added_at: Date.now() }];
    });
  }, []);

  const removeItem = useCallback((listingId: string) => {
    setItems(prev => prev.filter(i => i.listing_id !== listingId));
  }, []);

  const updateHours = useCallback((listingId: string, hours: number) => {
    setItems(prev => prev.map(i => i.listing_id === listingId ? { ...i, hours } : i));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback((listingId: string) => {
    return items.some(i => i.listing_id === listingId);
  }, [items]);

  const totalItems = items.length;
  const subtotalCents = items.reduce((s, i) => s + Math.round(i.price_per_hour * i.hours * 100), 0);

  // Group by provider
  const byProvider = items.reduce((acc, item) => {
    if (!acc[item.provider_id]) {
      acc[item.provider_id] = { provider_name: item.provider_name, items: [], subtotal_cents: 0 };
    }
    const sub = Math.round(item.price_per_hour * item.hours * 100);
    acc[item.provider_id].items.push(item);
    acc[item.provider_id].subtotal_cents += sub;
    return acc;
  }, {} as Record<string, { provider_name: string; items: CartItem[]; subtotal_cents: number }>);

  return { items, addItem, removeItem, updateHours, clearCart, isInCart, totalItems, subtotalCents, byProvider };
}
