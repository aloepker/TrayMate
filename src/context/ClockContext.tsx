import React, { createContext, useState, useEffect, ReactNode } from 'react';

// 1. Define the data shape
interface ClockContextType {
  currentTime: Date;
}

// 2. Create the Context object
export const ClockContext = createContext<ClockContextType | undefined>(undefined);

// 3. Create the Provider component
export const ClockProvider = ({ children }: { children: ReactNode }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // This interval starts as soon as the app boots up
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // --- ADD YOUR GLOBAL LOGIC HERE ---
      // Example: if (now.getHours() === 12) { alert('Lunch Time!') }
      
    }, 60000); // Updates every 60 seconds

    return () => clearInterval(interval); // Cleanup on close
  }, []);

  return (
    <ClockContext.Provider value={{ currentTime }}>
      {children}
    </ClockContext.Provider>
  );
};