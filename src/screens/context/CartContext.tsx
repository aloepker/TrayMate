import React, { createContext, useContext, useState, ReactNode } from 'react';

// Meal type definition
type Meal = {
  id: number;
  name: string;
  meal_period: 'Breakfast' | 'Lunch' | 'Dinner';
  description: string;
  kcal: number;
  sodium_mg: number;
  protein_g: number;
  tags?: string[];
};

// Order type — a confirmed group of meals
export type Order = {
  id: string;
  items: Meal[];
  status: 'confirmed' | 'preparing' | 'ready' | 'completed';
  placedAt: Date;
  totalNutrition: { calories: number; sodium: number; protein: number };
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
  placeOrder: () => Order | null;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
};

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component - wrap your app with this
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Meal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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

  const placeOrder = (): Order | null => {
    if (cart.length === 0) return null;

    const totals = getTotalNutrition();
    const newOrder: Order = {
      id: `order_${Date.now()}`,
      items: [...cart],
      status: 'confirmed',
      placedAt: new Date(),
      totalNutrition: totals,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
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
        updateOrderStatus,
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
