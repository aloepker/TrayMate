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
  placeOrder: (residentId?: string, mealOfDay?: string) => Promise<{ order: Order | null; conflict?: MealOrderResponse; complianceBlock?: ComplianceResult }>;
  replaceOrder: (backendOrderId: number, residentId: string, mealOfDay?: string) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  getOrdersForResident: (residentId: string) => Order[];
  fetchOrderHistory: (userId: string) => Promise<void>;
  clearAllOrders: (residentId?: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
};

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);

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
  ): Order => {
    const totals = getTotalNutrition();
    return {
      id: backendId ? `backend_${backendId}` : `order_${Date.now()}`,
      backendId,
      residentId,
      items: [...cart],
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
    mealOfDay?: string
  ): Promise<{ order: Order | null; conflict?: MealOrderResponse; complianceBlock?: ComplianceResult }> => {
    if (cart.length === 0) return { order: null };

    const rid = residentId || 'unknown';
    const meal = mealOfDay || deriveMealOfDay();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const itemIds = cart.map((m) => String(m.id)).join(', ');

    try {
      const response = await placeOrderApi({
        date: today,
        mealOfDay: meal,
        userId: rid,
        mealItemsIdNumbers: itemIds,
      });

      // Success — backend returned 201
      const newOrder = buildLocalOrder(rid, response.id, meal, today);
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
      const localOrder = buildLocalOrder(rid, undefined, meal, today);
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
    mealOfDay?: string
  ): Promise<Order | null> => {
    if (cart.length === 0) return null;

    const rid = residentId || 'unknown';
    const meal = mealOfDay || deriveMealOfDay();
    const today = new Date().toISOString().slice(0, 10);
    const itemIds = cart.map((m) => String(m.id)).join(', ');

    try {
      const response = await replaceOrderApi(backendOrderId, {
        date: today,
        mealOfDay: meal,
        userId: rid,
        mealItemsIdNumbers: itemIds,
      });

      const newOrder = buildLocalOrder(rid, response.id, meal, today);
      // Remove old order with same backend ID if present
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.backendId !== backendOrderId)]);
      setCart([]);
      return newOrder;
    } catch (err: any) {
      console.warn('Backend replace failed, saving locally:', err?.message);
      const localOrder = buildLocalOrder(rid, undefined, meal, today);
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
        // Use ISO string from backend directly — preserves actual timestamp
        placedAt: new Date((entry.order as any).date ?? (entry.order as any).createdAt ?? Date.now()),
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
        // Map keyed by backendId so duplicates collapse — last write wins
        // (which is fine; the backend payload is the source of truth).
        const seen = new Map<string, typeof backendOrders[number]>();
        for (const o of backendOrders) {
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
