import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  placeOrderApi,
  replaceOrderApi,
  getOrderHistoryApi,
  deleteOrderApi,
  removeOrderApi,
  type MealOrderResponse,
  type ComplianceResult,
} from '../../services/api';
import { cachePersistedMealTranslations } from '../../services/mealLocalization';
import { getOrderPlacedAt, setOrderPlacedAt } from '../../services/storage';

// Meal type definition
type Meal = {
  id: number;
  name: string;
  meal_period: 'Breakfast' | 'Lunch' | 'Dinner' | 'Drinks' | 'Sides';
  description: string;
  kcal: number;
  sodium_mg: number;
  protein_g: number;
  tags?: string[];
  specialNote?: string;
};

// Order type — a confirmed group of meals, scoped to a resident
export type Order = {
  id: string;
  backendId?: number;       // ID from backend /mealOrders
  residentId: string;
  items: Meal[];
  status: 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'substitution_requested';
  placedAt: Date;
  totalNutrition: { calories: number; sodium: number; protein: number };
  // Composite key for the tested DELETE /mealOrders/remove endpoint
  mealOfDay?: string;       // "Breakfast" | "Lunch" | "Dinner"
  date?: string;            // "YYYY-MM-DD"
};

// What the context provides
type CartContextType = {
  cart: Meal[];
  addToCart: (meal: Meal) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getTotalNutrition: () => { calories: number; sodium: number; protein: number };
  // Orders
  orders: Order[];
  placeOrder: (residentId?: string, mealOfDay?: string, itemsOverride?: Meal[]) => Promise<{ order: Order | null; conflict?: MealOrderResponse; complianceBlock?: ComplianceResult }>;
  replaceOrder: (backendOrderId: number, residentId: string, mealOfDay?: string, itemsOverride?: Meal[]) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  getOrdersForResident: (residentId: string) => Order[];
  fetchOrderHistory: (userId: string) => Promise<void>;
  clearAllOrders: (residentId?: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
};

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);
const BREAKFAST_PREORDER_NOTE_TAG = "[FOR TOMORROW'S BREAKFAST]";

// Provider component - wrap your app with this
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Meal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deletedBackendIds, setDeletedBackendIds] = useState<Set<number>>(new Set());

  const addToCart = (meal: Meal) => {
    setCart((prev) => [...prev, meal]);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart.splice(index, 1);
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartCount = () => {
    return cart.length;
  };

  const getTotalNutrition = () => {
    return cart.reduce(
      (acc, item) => ({
        calories: acc.calories + item.kcal,
        sodium: acc.sodium + item.sodium_mg,
        protein: acc.protein + item.protein_g,
      }),
      { calories: 0, sodium: 0, protein: 0 }
    );
  };

  const buildOrderNote = (): string | null => {
    const notedItems = cart
      .map((item) => {
        const raw = String(item.specialNote ?? "").trim();
        if (!raw) return null;
        const cleaned = raw.replace(BREAKFAST_PREORDER_NOTE_TAG, "").trim();
        return { item, raw, cleaned };
      })
      .filter((entry): entry is { item: Meal; raw: string; cleaned: string } => entry !== null);

    if (notedItems.length === 0) return null;

    const hasBreakfastPreorder = notedItems.some((entry) =>
      entry.raw.includes(BREAKFAST_PREORDER_NOTE_TAG)
    );
    const visibleNotes = notedItems
      .filter((entry) => entry.cleaned.length > 0)
      .map((entry) =>
        notedItems.length === 1
          ? entry.cleaned
          : `${entry.item.name}: ${entry.cleaned}`
      );

    const parts = [
      hasBreakfastPreorder ? BREAKFAST_PREORDER_NOTE_TAG : "",
      ...visibleNotes,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join("\n") : null;
  };

  /** Determine the dominant meal period from cart items */
  const deriveMealOfDay = (): string => {
    const periods = cart.map((m) => m.meal_period).filter((p) => p !== 'Drinks' && p !== 'Sides');
    if (periods.length > 0) {
      // Most frequent main-meal period wins
      const counts: Record<string, number> = {};
      periods.forEach((p) => { counts[p] = (counts[p] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
    // No main meal in the cart — happens when the main is unavailable/
    // restricted and the resident only added a drink and/or side. Fall
    // back to the actual clock time so the order gets filed under the
    // current meal window (and, importantly, NOT silently shoved into
    // 'Lunch' at 8am or 7pm).
    const mins = new Date().getHours() * 60 + new Date().getMinutes();
    if (mins >= 7 * 60  && mins <= 10 * 60) return 'Breakfast';
    if (mins >= 11 * 60 && mins <= 14 * 60) return 'Lunch';
    if (mins >= 16 * 60 && mins <= 19 * 60) return 'Dinner';
    // Outside any serving window — pick the next upcoming period so the
    // order is queued for the right tray run rather than landing in the
    // wrong bucket.
    if (mins < 7 * 60)  return 'Breakfast';
    if (mins < 11 * 60) return 'Lunch';
    if (mins < 16 * 60) return 'Dinner';
    return 'Breakfast'; // after 7pm → tomorrow's breakfast
  };

  /** Build a local Order object from cart state */
  const buildLocalOrder = (
    residentId: string,
    backendId?: number,
    mealOfDay?: string,
    date?: string,
    itemsOverride?: Meal[],
  ): Order => {
    const itemsToUse = itemsOverride ?? cart;
    const totals = itemsOverride
      ? {
          calories: itemsToUse.reduce((s, m) => s + m.kcal, 0),
          sodium:   itemsToUse.reduce((s, m) => s + m.sodium_mg, 0),
          protein:  itemsToUse.reduce((s, m) => s + m.protein_g, 0),
        }
      : getTotalNutrition();
    return {
      id: backendId ? `backend_${backendId}` : `order_${Date.now()}`,
      backendId,
      residentId,
      items: [...itemsToUse],
      status: 'confirmed',
      placedAt: new Date(),
      totalNutrition: totals,
      mealOfDay,
      date,
    };
  };

  /**
   * Place an order — tries the backend first, falls back to local.
   * Returns { order, conflict? }. If conflict is set, the caller should
   * ask the user whether to replace the existing order.
   */
  const placeOrder = async (
    residentId?: string,
    mealOfDay?: string,
    // Callers like the auto-order bell pass items directly because the
    // cart state hasn't flushed yet by the time they invoke this in
    // the same event handler. Without this, `cart` reads the stale
    // closure value (empty) and we'd return `{ order: null }` even
    // though the addToCart side-effect lands moments later — that
    // produced the "Order Failed but items show up in cart" bug.
    itemsOverride?: Meal[],
  ): Promise<{ order: Order | null; conflict?: MealOrderResponse; complianceBlock?: ComplianceResult }> => {
    const itemsToUse = itemsOverride && itemsOverride.length > 0 ? itemsOverride : cart;
    if (itemsToUse.length === 0) return { order: null };

    const rid = residentId || 'unknown';
    const meal = mealOfDay || deriveMealOfDay();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const itemIds = itemsToUse.map((m) => String(m.id)).join(', ');
    const orderNote = buildOrderNote();

    try {
      const response = await placeOrderApi({
        date: today,
        mealOfDay: meal,
        userId: rid,
        mealItemsIdNumbers: itemIds,
        note: orderNote,
        specialInstructions: orderNote,
      });

      // Success — backend returned 201. Snapshot the device clock as
      // the canonical placedAt for this order so every future
      // re-fetch (which loses the time when reading back a LocalDate)
      // can recover the original moment instead of falling back to
      // noon-of-the-day. Fire-and-forget; if storage fails we still
      // keep the in-memory value.
      const newOrder = buildLocalOrder(rid, response.id, meal, today, itemsToUse);
      if (response.id != null) {
        setOrderPlacedAt(response.id, newOrder.placedAt).catch(() => {});
      }
      setOrders((prev) => [newOrder, ...prev]);
      setCart([]);
      return { order: newOrder };
    } catch (err: any) {
      if (err?.status === 409) {
        const conflictData = err?.data?.data ?? err?.data;
        if (conflictData?.id) {
          return { order: null, conflict: conflictData };
        }
        return {
          order: null,
          conflict: {
            id: 0,
            date: today,
            mealOfDay: meal,
            userId: rid,
            status: 'pending',
            mealItemsIdNumbers: itemIds,
          },
        };
      }

      // 422 COMPLIANCE_BLOCKED — backend rejected because one or more meals
      // violate the resident's dietary profile. Surface the full result so
      // the UI can show per-meal violations and offer the override path.
      if (err?.status === 422 && err?.data?.errorCode === 'COMPLIANCE_BLOCKED') {
        return { order: null, complianceBlock: err.data.data as ComplianceResult };
      }

      // Network error or other failure — fall back to local-only order
      console.warn('Backend order failed, saving locally:', err?.message);
      const localOrder = buildLocalOrder(rid, undefined, meal, today, itemsToUse);
      setOrders((prev) => [localOrder, ...prev]);
      setCart([]);
      return { order: localOrder };
    }
  };

  /**
   * Replace an existing backend order (after 409 conflict).
   */
  const replaceOrder = async (
    backendOrderId: number,
    residentId: string,
    mealOfDay?: string,
    itemsOverride?: Meal[],
  ): Promise<Order | null> => {
    const itemsToUse = itemsOverride && itemsOverride.length > 0 ? itemsOverride : cart;
    if (itemsToUse.length === 0) return null;

    const rid = residentId || 'unknown';
    const meal = mealOfDay || deriveMealOfDay();
    const today = new Date().toISOString().slice(0, 10);
    const itemIds = itemsToUse.map((m) => String(m.id)).join(', ');
    const orderNote = buildOrderNote();

    try {
      const response = await replaceOrderApi(backendOrderId, {
        date: today,
        mealOfDay: meal,
        userId: rid,
        mealItemsIdNumbers: itemIds,
        note: orderNote,
        specialInstructions: orderNote,
      });

      const newOrder = buildLocalOrder(rid, response.id, meal, today, itemsToUse);
      if (response.id != null) {
        setOrderPlacedAt(response.id, newOrder.placedAt).catch(() => {});
      }
      // Remove old order with same backend ID if present
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.backendId !== backendOrderId)]);
      setCart([]);
      return newOrder;
    } catch (err: any) {
      console.warn('Backend replace failed, saving locally:', err?.message);
      const localOrder = buildLocalOrder(rid, undefined, meal, today, itemsToUse);
      setOrders((prev) => [localOrder, ...prev]);
      setCart([]);
      return localOrder;
    }
  };

  /**
   * Fetch order history from backend and merge into local state.
   */
  const fetchOrderHistory = async (userId: string): Promise<void> => {
    try {
      const history = await getOrderHistoryApi(userId);
      if (!history || history.length === 0) return;

      // Pre-load device-clock placedAt snapshots for every order in
      // the response. This is the per-tablet record of when an order
      // was actually placed — used to override the backend's bare
      // LocalDate (which has no time component) and survives app
      // restarts.
      const cachedPlacedAt = new Map<string, Date>();
      await Promise.all(
        history.map(async (entry) => {
          const id = entry?.order?.id;
          if (id == null) return;
          const cached = await getOrderPlacedAt(id);
          if (cached) cachedPlacedAt.set(String(id), cached);
        }),
      );

      const backendOrders: Order[] = history
      .filter((entry) => !deletedBackendIds.has(entry.order.id))
      .map((entry) => ({
        id: `backend_${entry.order.id}`,
        backendId: entry.order.id,
        residentId: entry.order.userId,
        items: entry.meals.map((m) => {
          cachePersistedMealTranslations(m);
          return {
            id: m.id,
            name: m.name,
            meal_period: (m.mealperiod?.split(',')[0]?.trim() || 'Lunch') as Meal['meal_period'],
            description: m.description,
            kcal: m.calories,
            sodium_mg: m.sodium,
            protein_g: m.protein,
            tags: m.tags ? m.tags.split(',').map((t) => t.trim()) : [],
            // Carry the meal photo through so upcoming-meals + history
            // screens can render the same image the menu uses, instead
            // of falling back to the generic fork-and-knife placeholder.
            imageUrl: (m as any).imageUrl ?? undefined,
          };
        }),
        status: (() => {
          const s = entry.order.status as string;
          if (s === 'pending') return 'confirmed';
          if (s === 'cancelled' || s === 'canceled') return 'cancelled';
          if (s === 'substitution_requested') return 'substitution_requested';
          if (['confirmed','preparing','ready','completed'].includes(s)) return s as Order['status'];
          return 'confirmed';
        })(),
        // Placeholder — replaced below inside setOrders so we can
        // preserve the original placedAt from prior state and avoid
        // the "time keeps moving" bug when the backend hasn't shipped
        // the createdAt column yet.
        placedAt: new Date(0),
        totalNutrition: {
          calories: entry.meals.reduce((sum, m) => sum + m.calories, 0),
          sodium: entry.meals.reduce((sum, m) => sum + m.sodium, 0),
          protein: entry.meals.reduce((sum, m) => sum + m.protein, 0),
        },
        mealOfDay: entry.order.mealOfDay,
        date: entry.order.date,
      }));

      // Merge: keep local-only orders (no backendId) + replace backend orders.
      // De-dupe by backendId so the same backend order can never appear twice
      // even if fetchOrderHistory races itself (focus events can fire faster
      // than network round-trips, and cluster-orders from the old auto-place
      // bug also produced visible duplicates here).
      setOrders((prev) => {
        const otherResidents = prev.filter((o) => String(o.residentId) !== String(userId));
        const localOnlyForThisResident = prev.filter(
          (o) => String(o.residentId) === String(userId) && !o.backendId,
        );
        // Build a lookup so we can carry forward each order's existing
        // placedAt — that timestamp is set ONCE (either by the backend
        // createdAt or by the local Date.now() at place time) and must
        // not drift on subsequent refreshes.
        const prevByBackendId = new Map<string, Order>();
        for (const o of prev) {
          if (o.backendId != null) prevByBackendId.set(String(o.backendId), o);
        }
        const resolvePlacedAt = (entry: any, fallbackOrder: Order): Date => {
          // Priority order, most authoritative first:
          //   1. Backend createdAt (real DATETIME, once deployed)
          //   2. EncryptedStorage cache (device clock at place time)
          //   3. Already-in-memory placedAt (don't drift across renders)
          //   4. Parse the bare LocalDate at noon local (stable, no TZ shift)
          const raw = entry?.createdAt;
          if (raw) return new Date(raw);
          const cached = cachedPlacedAt.get(String(fallbackOrder.backendId));
          if (cached) return cached;
          const existing = prevByBackendId.get(String(fallbackOrder.backendId));
          if (existing) return existing.placedAt;
          const rawDate = entry?.date;
          if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            return new Date(`${rawDate}T12:00:00`);
          }
          return new Date(rawDate ?? Date.now());
        };
        const resolved = backendOrders.map((o) => ({
          ...o,
          placedAt: resolvePlacedAt(
            history.find((h) => h.order.id === o.backendId)?.order,
            o,
          ),
        }));
        // Map keyed by backendId so duplicates collapse — last write wins
        // (which is fine; the backend payload is the source of truth).
        const seen = new Map<string, typeof resolved[number]>();
        for (const o of resolved) {
          if (o.backendId != null) seen.set(String(o.backendId), o);
        }
        return [
          ...otherResidents,
          ...Array.from(seen.values()),
          ...localOnlyForThisResident,
        ];
      });
    } catch (err: any) {
      console.warn('Failed to fetch order history:', err?.message);
    }
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const getOrdersForResident = (residentId: string): Order[] => {
    // Use String() compare — backend may return numeric IDs while route params are strings
    return orders.filter((o) => String(o.residentId) === String(residentId));
  };

  /**
   * Delete a single order on the backend.
   * Prefers the tested composite-key endpoint:
   *   DELETE /mealOrders/remove?userId=X&mealOfDay=X&date=YYYY-MM-DD
   * Falls back to DELETE /mealOrders/{orderId} if composite key fields
   * aren't available on the local Order.
   */
  const deleteOrderOnBackend = async (order: Order): Promise<void> => {
    if (order.mealOfDay && order.date && order.residentId) {
      await removeOrderApi({
        userId: order.residentId,
        mealOfDay: order.mealOfDay,
        date: order.date,
      });
      return;
    }
    if (order.backendId != null) {
      await deleteOrderApi(order.backendId);
    }
  };

  /**
   * Remove a single order — deletes from backend first, then local state.
   * Falls back to local-only removal if backend call fails.
   */
  const removeOrder = async (orderId: string): Promise<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (order?.backendId) {
      // Track this ID so fetchOrderHistory won't re-add it even if delete fails
      setDeletedBackendIds((prev) => new Set(prev).add(order.backendId!));
    }
    if (order) {
      try {
        await deleteOrderOnBackend(order);
      } catch (err: any) {
        console.warn('Backend delete failed, removing locally only:', err?.message);
      }
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  /**
   * Clear all orders for a specific resident (or all if no residentId).
   * Deletes each order from the backend, then clears local state.
   */
  const clearAllOrders = async (residentId?: string): Promise<void> => {
    const toDelete = residentId
      ? orders.filter((o) => String(o.residentId) === String(residentId))
      : orders;

    // Delete from backend in parallel, ignoring individual failures
    await Promise.allSettled(
      toDelete
        .filter((o) => o.backendId != null || (o.mealOfDay && o.date))
        .map((o) => deleteOrderOnBackend(o))
    );

    // Remove cleared orders from local state
    if (residentId) {
      setOrders((prev) => prev.filter((o) => String(o.residentId) !== String(residentId)));
    } else {
      setOrders([]);
      setCart([]);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        getCartCount,
        getTotalNutrition,
        orders,
        placeOrder,
        replaceOrder,
        updateOrderStatus,
        getOrdersForResident,
        fetchOrderHistory,
        clearAllOrders,
        removeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Hook to use the cart - call this in any component
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
