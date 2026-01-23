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

// What the context provides
type CartContextType = {
  cart: Meal[];
  addToCart: (meal: Meal) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getTotalNutrition: () => { calories: number; sodium: number; protein: number };
};

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component - wrap your app with this
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Meal[]>([]);

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

  return (
    <CartContext.Provider 
      value={{ 
        cart, 
        addToCart, 
        removeFromCart, 
        clearCart, 
        getCartCount,
        getTotalNutrition 
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